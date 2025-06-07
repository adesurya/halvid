// middleware/adminAuth.js
const { AdminUserModel } = require('../models/AdminModels');

// Middleware untuk autentikasi admin
const requireAuth = async (req, res, next) => {
    try {
        // Check session
        if (!req.session || !req.session.adminId || !req.session.sessionId) {
            return redirectToLogin(req, res);
        }

        // Verify session in database
        const session = await AdminUserModel.getSession(req.session.sessionId);
        if (!session) {
            req.session.destroy();
            return redirectToLogin(req, res);
        }

        // Add admin info to request
        req.admin = {
            id: session.admin_id,
            username: session.username,
            role: session.role,
            full_name: session.full_name
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return redirectToLogin(req, res);
    }
};

// Middleware untuk cek role admin
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return redirectToLogin(req, res);
        }

        if (Array.isArray(allowedRoles)) {
            if (!allowedRoles.includes(req.admin.role)) {
                return res.status(403).render('admin/error', {
                    message: 'Akses ditolak. Anda tidak memiliki permission untuk halaman ini.',
                    error: { status: 403 }
                });
            }
        } else {
            if (req.admin.role !== allowedRoles) {
                return res.status(403).render('admin/error', {
                    message: 'Akses ditolak. Anda tidak memiliki permission untuk halaman ini.',
                    error: { status: 403 }
                });
            }
        }

        next();
    };
};

// Helper function untuk redirect ke login
const redirectToLogin = (req, res) => {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            success: false,
            message: 'Session expired. Please login again.',
            redirect: '/admin/login'
        });
    }
    
    // Store intended URL for redirect after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/admin/login');
};

// Middleware untuk menambahkan admin info ke locals (untuk views)
const addAdminToLocals = (req, res, next) => {
    if (req.admin) {
        res.locals.admin = req.admin;
    }
    next();
};

// Middleware untuk cleanup expired sessions
const cleanupExpiredSessions = async (req, res, next) => {
    try {
        // Run cleanup occasionally (1% chance per request)
        if (Math.random() < 0.01) {
            await AdminUserModel.cleanExpiredSessions();
        }
    } catch (error) {
        console.error('Session cleanup error:', error);
        // Don't fail the request if cleanup fails
    }
    next();
};

// Rate limiting untuk login attempts
const loginRateLimit = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const rateLimitLogin = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!loginRateLimit[ip]) {
        loginRateLimit[ip] = { attempts: 0, lastAttempt: now };
    }
    
    const record = loginRateLimit[ip];
    
    // Reset attempts if lockout period has passed
    if (now - record.lastAttempt > LOCKOUT_TIME) {
        record.attempts = 0;
    }
    
    // Check if IP is locked out
    if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
        const timeRemaining = Math.ceil((LOCKOUT_TIME - (now - record.lastAttempt)) / 1000 / 60);
        return res.status(429).render('admin/login', {
            title: 'Admin Login',
            error: `Terlalu banyak percobaan login. Coba lagi dalam ${timeRemaining} menit.`
        });
    }
    
    // Track failed login attempt
    if (req.method === 'POST') {
        record.attempts++;
        record.lastAttempt = now;
        
        // Clean up old records periodically
        if (Math.random() < 0.1) {
            Object.keys(loginRateLimit).forEach(key => {
                if (now - loginRateLimit[key].lastAttempt > LOCKOUT_TIME * 2) {
                    delete loginRateLimit[key];
                }
            });
        }
    }
    
    next();
};

// Reset login attempts on successful login
const resetLoginAttempts = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (loginRateLimit[ip]) {
        delete loginRateLimit[ip];
    }
    next();
};

// Middleware untuk log admin activities
const logAdminActivity = (action) => {
    return (req, res, next) => {
        if (req.admin) {
            console.log(`[ADMIN] ${req.admin.username} (${req.admin.role}) - ${action} - ${req.method} ${req.originalUrl}`);
            
            // You can expand this to log to database
            // await AdminActivityModel.log({
            //     admin_id: req.admin.id,
            //     action,
            //     method: req.method,
            //     url: req.originalUrl,
            //     ip: req.ip,
            //     user_agent: req.get('User-Agent')
            // });
        }
        next();
    };
};

// Middleware untuk validasi file upload
const validateFileUpload = (allowedTypes, maxSize) => {
    return (req, res, next) => {
        if (!req.files && !req.file) {
            return next();
        }

        const files = req.files ? Object.values(req.files).flat() : [req.file];
        
        for (const file of files) {
            if (!file) continue;
            
            // Check file type
            if (allowedTypes && !allowedTypes.some(type => file.mimetype.startsWith(type))) {
                return res.status(400).json({
                    success: false,
                    message: `Tipe file tidak diizinkan. Hanya ${allowedTypes.join(', ')} yang diperbolehkan.`
                });
            }
            
            // Check file size
            if (maxSize && file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: `Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / 1024 / 1024)}MB.`
                });
            }
        }
        
        next();
    };
};

// Security headers middleware untuk admin routes
const securityHeaders = (req, res, next) => {
    // Prevent iframe embedding
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filtering
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // HTTPS only (if in production)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy for admin area
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://cdnjs.cloudflare.com",
        "connect-src 'self' https:",
        "media-src 'self' https: blob:",
        "frame-src 'none'"
    ].join('; '));
    
    next();
};

// CSRF protection untuk form submissions
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        // Generate CSRF token for forms
        if (!req.session.csrfToken) {
            req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        }
        res.locals.csrfToken = req.session.csrfToken;
        return next();
    }
    
    // Verify CSRF token for POST/PUT/DELETE requests
    const token = req.body.csrfToken || req.headers['x-csrf-token'];
    
    if (!token || token !== req.session.csrfToken) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({
                success: false,
                message: 'Invalid CSRF token'
            });
        }
        return res.status(403).render('admin/error', {
            message: 'Invalid CSRF token. Please refresh the page and try again.',
            error: { status: 403 }
        });
    }
    
    next();
};

// Error handler untuk admin routes
const adminErrorHandler = (err, req, res, next) => {
    console.error('Admin error:', err);
    
    // Log error details for debugging
    console.error('Stack:', err.stack);
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('Admin:', req.admin?.username);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
    
    res.status(500).render('admin/error', {
        message: 'Terjadi kesalahan pada server',
        error: process.env.NODE_ENV === 'development' ? err : { status: 500 }
    });
};

// Middleware untuk check maintenance mode
const checkMaintenanceMode = (req, res, next) => {
    if (process.env.MAINTENANCE_MODE === 'true') {
        // Allow super admin to access during maintenance
        if (req.admin?.role !== 'super_admin') {
            return res.status(503).render('admin/maintenance', {
                message: 'Sistem sedang dalam maintenance. Silakan coba lagi nanti.'
            });
        }
    }
    next();
};

module.exports = {
    requireAuth,
    requireRole,
    addAdminToLocals,
    cleanupExpiredSessions,
    rateLimitLogin,
    resetLoginAttempts,
    logAdminActivity,
    validateFileUpload,
    securityHeaders,
    csrfProtection,
    adminErrorHandler,
    checkMaintenanceMode
};