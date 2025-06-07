// routes/admin.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const {
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
} = require('../middleware/adminAuth');

// Apply security headers to all admin routes
router.use(securityHeaders);

// Apply session cleanup
router.use(cleanupExpiredSessions);

// ===== PUBLIC ROUTES (NO AUTH REQUIRED) =====
// Login page
router.get('/login', AdminController.loginPage);

// Login process
router.post('/login', 
    rateLimitLogin,
    AdminController.login,
    resetLoginAttempts
);

// ===== PROTECTED ROUTES (AUTH REQUIRED) =====
// Apply authentication middleware to all routes below
router.use(requireAuth);
router.use(addAdminToLocals);
router.use(checkMaintenanceMode);
router.use(csrfProtection);

// Logout
router.post('/logout', AdminController.logout);

// Dashboard
router.get('/', AdminController.dashboard);
router.get('/dashboard', AdminController.dashboard);

// ===== CATEGORY MANAGEMENT =====
router.get('/categories', 
    logAdminActivity('view_categories'),
    AdminController.categoriesPage
);

router.get('/categories/create', 
    requireRole(['super_admin', 'admin']),
    logAdminActivity('create_category_form'),
    AdminController.createCategoryPage
);

router.post('/categories',
    requireRole(['super_admin', 'admin']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['image'], 5 * 1024 * 1024), // 5MB limit for images
    logAdminActivity('create_category'),
    AdminController.createCategory
);

router.get('/categories/:id/edit',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('edit_category_form'),
    AdminController.editCategoryPage
);

router.put('/categories/:id',
    requireRole(['super_admin', 'admin']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['image'], 5 * 1024 * 1024),
    logAdminActivity('update_category'),
    AdminController.updateCategory
);

router.delete('/categories/:id',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('delete_category'),
    AdminController.deleteCategory
);

// ===== SERIES MANAGEMENT =====
router.get('/series',
    logAdminActivity('view_series'),
    AdminController.seriesPage
);

router.get('/series/create',
    requireRole(['super_admin', 'admin', 'editor']),
    logAdminActivity('create_series_form'),
    AdminController.createSeriesPage
);

router.post('/series',
    requireRole(['super_admin', 'admin', 'editor']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['image'], 5 * 1024 * 1024),
    logAdminActivity('create_series'),
    AdminController.createSeries
);

router.get('/series/:id/edit',
    requireRole(['super_admin', 'admin', 'editor']),
    logAdminActivity('edit_series_form'),
    AdminController.editSeriesPage
);

router.put('/series/:id',
    requireRole(['super_admin', 'admin', 'editor']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['image'], 5 * 1024 * 1024),
    logAdminActivity('update_series'),
    AdminController.updateSeries
);

router.delete('/series/:id',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('delete_series'),
    AdminController.deleteSeries
);

// ===== VIDEO MANAGEMENT =====
router.get('/videos',
    logAdminActivity('view_videos'),
    AdminController.videosPage
);

router.get('/videos/upload',
    requireRole(['super_admin', 'admin', 'editor']),
    logAdminActivity('upload_video_form'),
    AdminController.uploadVideoPage
);

router.post('/videos/upload',
    requireRole(['super_admin', 'admin', 'editor']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['video', 'image'], 500 * 1024 * 1024), // 500MB limit for videos
    logAdminActivity('upload_video'),
    AdminController.uploadVideo
);

router.get('/videos/:id/edit',
    requireRole(['super_admin', 'admin', 'editor']),
    logAdminActivity('edit_video_form'),
    AdminController.editVideoPage
);

router.put('/videos/:id',
    requireRole(['super_admin', 'admin', 'editor']),
    AdminController.uploadVideoMulter,
    validateFileUpload(['image'], 5 * 1024 * 1024),
    logAdminActivity('update_video'),
    AdminController.updateVideo
);

router.delete('/videos/:id',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('delete_video'),
    AdminController.deleteVideo
);

router.post('/videos/bulk-update',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('bulk_update_videos'),
    AdminController.bulkUpdateVideos
);

// ===== ANALYTICS =====
router.get('/analytics',
    logAdminActivity('view_analytics'),
    AdminController.analyticsPage
);

// API endpoint untuk analytics data
router.get('/api/analytics',
    logAdminActivity('api_analytics'),
    AdminController.getAnalyticsAPI
);

// ===== WASABI STORAGE =====
// Generate upload URL untuk direct upload
router.post('/api/upload-url',
    requireRole(['super_admin', 'admin', 'editor']),
    logAdminActivity('generate_upload_url'),
    AdminController.generateUploadUrl
);

// Get storage statistics
router.get('/api/storage-stats',
    requireRole(['super_admin', 'admin']),
    logAdminActivity('view_storage_stats'),
    AdminController.getStorageStats
);

// ===== SETTINGS & UTILITIES =====
// System settings (only super admin)
router.get('/settings',
    requireRole('super_admin'),
    logAdminActivity('view_settings'),
    (req, res) => {
        res.render('admin/settings', {
            title: 'System Settings',
            admin: req.admin
        });
    }
);

// Admin profile
router.get('/profile',
    logAdminActivity('view_profile'),
    (req, res) => {
        res.render('admin/profile', {
            title: 'Profile',
            admin: req.admin
        });
    }
);

// Help/Documentation
router.get('/help',
    logAdminActivity('view_help'),
    (req, res) => {
        res.render('admin/help', {
            title: 'Help & Documentation',
            admin: req.admin
        });
    }
);

// ===== API ROUTES =====
// Categories API
router.get('/api/categories', AdminController.categoriesPage);
router.get('/api/categories/:id', AdminController.editCategoryPage);

// Series API  
router.get('/api/series', AdminController.seriesPage);
router.get('/api/series/:id', AdminController.editSeriesPage);

// Videos API
router.get('/api/videos', AdminController.videosPage);
router.get('/api/videos/:id', AdminController.editVideoPage);

// Quick stats API for dashboard widgets
router.get('/api/quick-stats',
    logAdminActivity('api_quick_stats'),
    async (req, res) => {
        try {
            const { AnalyticsModel } = require('../models/AdminModels');
            const stats = await AnalyticsModel.getDashboardStats();
            res.json({
                success: true,
                data: stats.totalStats
            });
        } catch (error) {
            console.error('Quick stats API error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get quick stats'
            });
        }
    }
);

// Search API for admin
router.get('/api/search',
    logAdminActivity('api_search'),
    async (req, res) => {
        try {
            const { q, type } = req.query;
            
            if (!q || q.length < 2) {
                return res.json({
                    success: true,
                    results: []
                });
            }

            const { VideoManagementModel, CategoryModel, SeriesModel } = require('../models/AdminModels');
            let results = [];

            switch (type) {
                case 'videos':
                    const videoResults = await VideoManagementModel.getAllVideosForAdmin(1, 10, { search: q });
                    results = videoResults.videos.map(video => ({
                        id: video.id,
                        title: video.title,
                        type: 'video',
                        url: `/admin/videos/${video.id}/edit`,
                        extra: video.status
                    }));
                    break;
                    
                case 'categories':
                    const categories = await CategoryModel.getAllCategories(true);
                    results = categories
                        .filter(cat => cat.name.toLowerCase().includes(q.toLowerCase()))
                        .map(cat => ({
                            id: cat.id,
                            title: cat.name,
                            type: 'category',
                            url: `/admin/categories/${cat.id}/edit`,
                            extra: cat.is_active ? 'Active' : 'Inactive'
                        }));
                    break;
                    
                case 'series':
                    const series = await SeriesModel.getAllSeries(null, true);
                    results = series
                        .filter(s => s.title.toLowerCase().includes(q.toLowerCase()))
                        .map(s => ({
                            id: s.id,
                            title: s.title,
                            type: 'series',
                            url: `/admin/series/${s.id}/edit`,
                            extra: s.category_name || 'No category'
                        }));
                    break;
                    
                default:
                    // Search all types
                    const [videos, cats, sers] = await Promise.all([
                        VideoManagementModel.getAllVideosForAdmin(1, 5, { search: q }),
                        CategoryModel.getAllCategories(true),
                        SeriesModel.getAllSeries(null, true)
                    ]);
                    
                    results = [
                        ...videos.videos.slice(0, 3).map(video => ({
                            id: video.id,
                            title: video.title,
                            type: 'video',
                            url: `/admin/videos/${video.id}/edit`,
                            extra: video.status
                        })),
                        ...cats
                            .filter(cat => cat.name.toLowerCase().includes(q.toLowerCase()))
                            .slice(0, 2)
                            .map(cat => ({
                                id: cat.id,
                                title: cat.name,
                                type: 'category',
                                url: `/admin/categories/${cat.id}/edit`,
                                extra: cat.is_active ? 'Active' : 'Inactive'
                            })),
                        ...sers
                            .filter(s => s.title.toLowerCase().includes(q.toLowerCase()))
                            .slice(0, 2)
                            .map(s => ({
                                id: s.id,
                                title: s.title,
                                type: 'series',
                                url: `/admin/series/${s.id}/edit`,
                                extra: s.category_name || 'No category'
                            }))
                    ];
                    break;
            }

            res.json({
                success: true,
                results: results.slice(0, 10),
                total: results.length
            });
        } catch (error) {
            console.error('Search API error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed'
            });
        }
    }
);

// Health check endpoint
router.get('/api/health',
    (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0'
        });
    }
);

// ===== ERROR HANDLING =====
// 404 handler for admin routes
router.use((req, res) => {
    res.status(404).render('admin/error', {
        message: 'Halaman admin tidak ditemukan',
        error: { status: 404 },
        admin: req.admin
    });
});

// Error handler
router.use(adminErrorHandler);

module.exports = router;