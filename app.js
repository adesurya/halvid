// app.js - Updated with new features
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import database config
const db = require('./config/database');

// Import routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

// ===== SECURITY & MIDDLEWARE =====

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https:"],
            mediaSrc: ["'self'", "https:", "blob:"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
    message: {
        error: 'Terlalu banyak request, silakan coba lagi nanti'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all requests
app.use(limiter);

// Stricter rate limiting for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit admin requests
    message: {
        error: 'Terlalu banyak request admin, silakan coba lagi nanti'
    }
});

// ===== SESSION CONFIGURATION =====

// Session store configuration
const sessionStore = new MySQLStore({
    expiration: 24 * 60 * 60 * 1000, // 24 hours
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, db);

// Session middleware
app.use(session({
    key: 'shortvideo_session',
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax'
    }
}));

// ===== VIEW ENGINE & MIDDLEWARE =====

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Static files untuk uploads (jika menggunakan local storage sebagai fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// ===== REQUEST LOGGING & ANALYTICS =====

// Request analytics middleware
app.use((req, res, next) => {
    // Log request for analytics
    if (req.path.startsWith('/video/') && req.method === 'GET') {
        // Track video page views
        console.log(`📹 Video access: ${req.path} from ${req.ip}`);
    }
    
    if (req.path.startsWith('/admin/')) {
        // Track admin activities
        console.log(`👨‍💼 Admin access: ${req.method} ${req.path} from ${req.ip}`);
    }
    
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ===== API ROUTES =====

// Public API routes
app.use('/api', indexRoutes);

// ===== MAIN ROUTES =====

// Public routes
app.use('/', indexRoutes);

// Admin routes with rate limiting
app.use('/admin', adminLimiter, adminRoutes);

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404 - Page not found: ${req.method} ${req.originalUrl}`);
    
    if (req.path.startsWith('/admin/')) {
        return res.status(404).render('admin/error', {
            message: 'Halaman admin tidak ditemukan',
            error: { status: 404 }
        });
    }
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint tidak ditemukan',
            error: 'Not Found'
        });
    }
    
    res.status(404).render('error', { 
        message: 'Halaman tidak ditemukan',
        error: { status: 404 }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Application Error:', err);
    
    // Log error details
    console.error('Stack:', err.stack);
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('IP:', req.ip);
    console.error('User Agent:', req.get('User-Agent'));
    
    // Handle specific error types
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File terlalu besar. Maksimal 500MB untuk video.';
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(413).json({
                success: false,
                message,
                error: 'File too large'
            });
        }
        
        return res.status(413).render('error', {
            message,
            error: { status: 413 }
        });
    }
    
    if (err.type === 'entity.parse.failed') {
        const message = 'Format data tidak valid';
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(400).json({
                success: false,
                message,
                error: 'Invalid JSON'
            });
        }
        
        return res.status(400).render('error', {
            message,
            error: { status: 400 }
        });
    }
    
    // Default error response
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Terjadi kesalahan pada server' 
        : err.message;
    
    if (req.path.startsWith('/admin/')) {
        return res.status(status).render('admin/error', {
            message,
            error: process.env.NODE_ENV === 'development' ? err : { status }
        });
    }
    
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(status).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? err.stack : 'Internal Server Error'
        });
    }
    
    res.status(status).render('error', { 
        message,
        error: process.env.NODE_ENV === 'development' ? err : { status }
    });
});

// ===== SERVER STARTUP =====

// Test database connection before starting
async function startServer() {
    try {
        // Test database connection
        await db.execute('SELECT 1');
        console.log('✅ Database connection successful');
        
        // Test Wasabi connection
        try {
            const { wasabiService } = require('./config/wasabi');
            const connectionTest = await wasabiService.testConnection();
            if (connectionTest.success) {
                console.log('✅ Wasabi connection successful');
            } else {
                console.warn('⚠️ Wasabi connection failed:', connectionTest.error);
            }
        } catch (wasabiError) {
            console.warn('⚠️ Wasabi configuration error:', wasabiError.message);
        }
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log('\n🎬 ShortVideo Server Started Successfully!');
            console.log('=====================================');
            console.log(`🌐 Server running at: http://localhost:${PORT}`);
            console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
            console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📅 Started at: ${new Date().toLocaleString()}`);
            console.log('=====================================\n');
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('💡 Development Tips:');
                console.log('   - Admin login: admin / admin123');
                console.log('   - API docs: http://localhost:' + PORT + '/api/docs');
                console.log('   - Health check: http://localhost:' + PORT + '/health');
                console.log('');
            }
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('💤 SIGTERM received, shutting down gracefully...');
            server.close(() => {
                console.log('✅ Process terminated');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log('\n💤 SIGINT received, shutting down gracefully...');
            server.close(() => {
                console.log('✅ Process terminated');
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('Please check your database connection and configuration.');
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;