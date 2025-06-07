// controllers/AdminController.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { wasabiService } = require('../config/wasabi');
const { 
    CategoryModel, 
    SeriesModel, 
    AdminUserModel, 
    AnalyticsModel,
    VideoManagementModel 
} = require('../models/AdminModels');

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'video') {
            // Video files
            if (file.mimetype.startsWith('video/')) {
                cb(null, true);
            } else {
                cb(new Error('Only video files are allowed'), false);
            }
        } else if (file.fieldname === 'thumbnail' || file.fieldname === 'image') {
            // Image files
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

class AdminController {
    // ===== AUTHENTICATION =====
    static async loginPage(req, res) {
        if (req.session && req.session.adminId) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/login', { 
            title: 'Admin Login',
            error: null 
        });
    }

    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.render('admin/login', {
                    title: 'Admin Login',
                    error: 'Username dan password harus diisi'
                });
            }

            const admin = await AdminUserModel.getAdminByUsername(username);
            if (!admin) {
                return res.render('admin/login', {
                    title: 'Admin Login',
                    error: 'Username atau password salah'
                });
            }

            const isValidPassword = await bcrypt.compare(password, admin.password);
            if (!isValidPassword) {
                return res.render('admin/login', {
                    title: 'Admin Login',
                    error: 'Username atau password salah'
                });
            }

            // Create session
            const sessionId = uuidv4();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            
            await AdminUserModel.createSession(sessionId, admin.id, expiresAt);
            await AdminUserModel.updateLastLogin(admin.id);

            // Set session cookie
            req.session.adminId = admin.id;
            req.session.sessionId = sessionId;
            req.session.username = admin.username;
            req.session.role = admin.role;

            res.redirect('/admin/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            res.render('admin/login', {
                title: 'Admin Login',
                error: 'Terjadi kesalahan sistem'
            });
        }
    }

    static async logout(req, res) {
        try {
            if (req.session && req.session.sessionId) {
                await AdminUserModel.deleteSession(req.session.sessionId);
            }
            req.session.destroy(() => {
                res.redirect('/admin/login');
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.redirect('/admin/login');
        }
    }

    // ===== DASHBOARD =====
    static async dashboard(req, res) {
        try {
            const stats = await AnalyticsModel.getDashboardStats();
            const topVideos = await AnalyticsModel.getTopVideos('week', 5);
            const recentDrafts = await VideoManagementModel.getVideosByStatus('draft', 5);

            res.render('admin/dashboard', {
                title: 'Dashboard Admin',
                admin: req.admin,
                stats,
                topVideos,
                recentDrafts
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat dashboard',
                error: error
            });
        }
    }

    // ===== CATEGORY MANAGEMENT =====
    static async categoriesPage(req, res) {
        try {
            const categories = await CategoryModel.getCategoriesWithStats();
            res.render('admin/categories', {
                title: 'Kelola Kategori',
                admin: req.admin,
                categories
            });
        } catch (error) {
            console.error('Categories page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman kategori',
                error: error
            });
        }
    }

    static async createCategoryPage(req, res) {
        res.render('admin/category-form', {
            title: 'Tambah Kategori',
            admin: req.admin,
            category: null,
            isEdit: false
        });
    }

    static async editCategoryPage(req, res) {
        try {
            const categoryId = parseInt(req.params.id);
            const category = await CategoryModel.getCategoryWithStats(categoryId);
            
            if (!category) {
                return res.status(404).render('admin/error', {
                    message: 'Kategori tidak ditemukan'
                });
            }

            res.render('admin/category-form', {
                title: 'Edit Kategori',
                admin: req.admin,
                category,
                isEdit: true
            });
        } catch (error) {
            console.error('Edit category page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman edit kategori',
                error: error
            });
        }
    }

    static async createCategory(req, res) {
        try {
            const { name, description, slug, color } = req.body;
            
            // Validate required fields
            if (!name || !slug) {
                return res.status(400).json({
                    success: false,
                    message: 'Nama dan slug kategori harus diisi'
                });
            }

            // Check if slug already exists
            const existingCategory = await CategoryModel.getCategoryBySlug(slug);
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug kategori sudah digunakan'
                });
            }

            // Handle image upload if provided
            let imageUrl = null;
            if (req.file) {
                const imageKey = wasabiService.generateFileKey(req.file.originalname, 'categories');
                const uploadResult = await wasabiService.uploadFile(req.file, imageKey);
                if (uploadResult.success) {
                    imageUrl = uploadResult.url;
                }
            }

            const categoryId = await CategoryModel.createCategory({
                name,
                description,
                slug,
                image: imageUrl,
                color: color || '#6366f1'
            });

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success: true,
                    message: 'Kategori berhasil dibuat',
                    categoryId
                });
            } else {
                res.redirect('/admin/categories');
            }
        } catch (error) {
            console.error('Create category error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Gagal membuat kategori'
                });
            } else {
                res.status(500).render('admin/error', {
                    message: 'Gagal membuat kategori',
                    error: error
                });
            }
        }
    }

    static async updateCategory(req, res) {
        try {
            const categoryId = parseInt(req.params.id);
            const { name, description, slug, color, is_active, sort_order } = req.body;

            const category = await CategoryModel.getCategoryById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori tidak ditemukan'
                });
            }

            // Check if slug already exists (except current category)
            const existingCategory = await CategoryModel.getCategoryBySlug(slug);
            if (existingCategory && existingCategory.id !== categoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug kategori sudah digunakan'
                });
            }

            // Handle image upload if provided
            let imageUrl = category.image;
            if (req.file) {
                const imageKey = wasabiService.generateFileKey(req.file.originalname, 'categories');
                const uploadResult = await wasabiService.uploadFile(req.file, imageKey);
                if (uploadResult.success) {
                    imageUrl = uploadResult.url;
                    // TODO: Delete old image from Wasabi if needed
                }
            }

            const success = await CategoryModel.updateCategory(categoryId, {
                name,
                description,
                slug,
                image: imageUrl,
                color: color || '#6366f1',
                is_active: is_active === 'true' || is_active === true,
                sort_order: parseInt(sort_order) || 0
            });

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success,
                    message: success ? 'Kategori berhasil diupdate' : 'Gagal mengupdate kategori'
                });
            } else {
                res.redirect('/admin/categories');
            }
        } catch (error) {
            console.error('Update category error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Gagal mengupdate kategori'
                });
            } else {
                res.status(500).render('admin/error', {
                    message: 'Gagal mengupdate kategori',
                    error: error
                });
            }
        }
    }

    static async deleteCategory(req, res) {
        try {
            const categoryId = parseInt(req.params.id);
            
            const category = await CategoryModel.getCategoryWithStats(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori tidak ditemukan'
                });
            }

            if (category.video_count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Tidak dapat menghapus kategori yang masih memiliki ${category.video_count} video`
                });
            }

            const success = await CategoryModel.deleteCategory(categoryId);
            
            // TODO: Delete category image from Wasabi if needed

            res.json({
                success,
                message: success ? 'Kategori berhasil dihapus' : 'Gagal menghapus kategori'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus kategori'
            });
        }
    }

    // ===== SERIES MANAGEMENT =====
    static async seriesPage(req, res) {
        try {
            const categoryId = req.query.category;
            const series = await SeriesModel.getAllSeries(categoryId);
            const categories = await CategoryModel.getAllCategories();

            res.render('admin/series', {
                title: 'Kelola Series',
                admin: req.admin,
                series,
                categories,
                selectedCategory: categoryId
            });
        } catch (error) {
            console.error('Series page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman series',
                error: error
            });
        }
    }

    static async createSeriesPage(req, res) {
        try {
            const categories = await CategoryModel.getAllCategories();
            res.render('admin/series-form', {
                title: 'Tambah Series',
                admin: req.admin,
                series: null,
                categories,
                isEdit: false
            });
        } catch (error) {
            console.error('Create series page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman tambah series',
                error: error
            });
        }
    }

    static async editSeriesPage(req, res) {
        try {
            const seriesId = parseInt(req.params.id);
            const series = await SeriesModel.getSeriesById(seriesId);
            const categories = await CategoryModel.getAllCategories();
            
            if (!series) {
                return res.status(404).render('admin/error', {
                    message: 'Series tidak ditemukan'
                });
            }

            res.render('admin/series-form', {
                title: 'Edit Series',
                admin: req.admin,
                series,
                categories,
                isEdit: true
            });
        } catch (error) {
            console.error('Edit series page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman edit series',
                error: error
            });
        }
    }

    static async createSeries(req, res) {
        try {
            const { title, description, slug, category_id } = req.body;
            
            if (!title || !slug) {
                return res.status(400).json({
                    success: false,
                    message: 'Judul dan slug series harus diisi'
                });
            }

            // Check if slug already exists
            const existingSeries = await SeriesModel.getSeriesBySlug(slug);
            if (existingSeries) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug series sudah digunakan'
                });
            }

            // Handle thumbnail upload if provided
            let thumbnailUrl = null;
            if (req.file) {
                const thumbnailKey = wasabiService.generateFileKey(req.file.originalname, 'series');
                const uploadResult = await wasabiService.uploadFile(req.file, thumbnailKey);
                if (uploadResult.success) {
                    thumbnailUrl = uploadResult.url;
                }
            }

            const seriesId = await SeriesModel.createSeries({
                title,
                description,
                slug,
                thumbnail: thumbnailUrl,
                category_id: category_id || null
            });

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success: true,
                    message: 'Series berhasil dibuat',
                    seriesId
                });
            } else {
                res.redirect('/admin/series');
            }
        } catch (error) {
            console.error('Create series error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Gagal membuat series'
                });
            } else {
                res.status(500).render('admin/error', {
                    message: 'Gagal membuat series',
                    error: error
                });
            }
        }
    }

    static async updateSeries(req, res) {
        try {
            const seriesId = parseInt(req.params.id);
            const { title, description, slug, category_id, is_active } = req.body;

            const series = await SeriesModel.getSeriesById(seriesId);
            if (!series) {
                return res.status(404).json({
                    success: false,
                    message: 'Series tidak ditemukan'
                });
            }

            // Check if slug already exists (except current series)
            const existingSeries = await SeriesModel.getSeriesBySlug(slug);
            if (existingSeries && existingSeries.id !== seriesId) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug series sudah digunakan'
                });
            }

            // Handle thumbnail upload if provided
            let thumbnailUrl = series.thumbnail;
            if (req.file) {
                const thumbnailKey = wasabiService.generateFileKey(req.file.originalname, 'series');
                const uploadResult = await wasabiService.uploadFile(req.file, thumbnailKey);
                if (uploadResult.success) {
                    thumbnailUrl = uploadResult.url;
                }
            }

            const success = await SeriesModel.updateSeries(seriesId, {
                title,
                description,
                slug,
                thumbnail: thumbnailUrl,
                category_id: category_id || null,
                is_active: is_active === 'true' || is_active === true
            });

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success,
                    message: success ? 'Series berhasil diupdate' : 'Gagal mengupdate series'
                });
            } else {
                res.redirect('/admin/series');
            }
        } catch (error) {
            console.error('Update series error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Gagal mengupdate series'
                });
            } else {
                res.status(500).render('admin/error', {
                    message: 'Gagal mengupdate series',
                    error: error
                });
            }
        }
    }

    static async deleteSeries(req, res) {
        try {
            const seriesId = parseInt(req.params.id);
            
            const seriesWithVideos = await SeriesModel.getSeriesWithVideos(seriesId);
            if (!seriesWithVideos) {
                return res.status(404).json({
                    success: false,
                    message: 'Series tidak ditemukan'
                });
            }

            if (seriesWithVideos.videos.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Tidak dapat menghapus series yang masih memiliki ${seriesWithVideos.videos.length} video`
                });
            }

            const success = await SeriesModel.deleteSeries(seriesId);
            
            res.json({
                success,
                message: success ? 'Series berhasil dihapus' : 'Gagal menghapus series'
            });
        } catch (error) {
            console.error('Delete series error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus series'
            });
        }
    }

    // ===== VIDEO MANAGEMENT =====
    static async videosPage(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status,
                category_id: req.query.category_id,
                series_id: req.query.series_id,
                search: req.query.search
            };

            const result = await VideoManagementModel.getAllVideosForAdmin(page, limit, filters);
            const categories = await CategoryModel.getAllCategories();
            const series = await SeriesModel.getAllSeries();

            res.render('admin/videos', {
                title: 'Kelola Video',
                admin: req.admin,
                ...result,
                categories,
                series,
                filters,
                currentUrl: req.originalUrl
            });
        } catch (error) {
            console.error('Videos page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman video',
                error: error
            });
        }
    }

    static async uploadVideoPage(req, res) {
        try {
            const categories = await CategoryModel.getAllCategories();
            const series = await SeriesModel.getAllSeries();
            
            res.render('admin/upload-video', {
                title: 'Upload Video',
                admin: req.admin,
                categories,
                series
            });
        } catch (error) {
            console.error('Upload video page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman upload',
                error: error
            });
        }
    }

    static async editVideoPage(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            const video = await VideoManagementModel.getVideoById(videoId);
            
            if (!video) {
                return res.status(404).render('admin/error', {
                    message: 'Video tidak ditemukan'
                });
            }

            const categories = await CategoryModel.getAllCategories();
            const series = await SeriesModel.getAllSeries();

            res.render('admin/edit-video', {
                title: 'Edit Video',
                admin: req.admin,
                video,
                categories,
                series
            });
        } catch (error) {
            console.error('Edit video page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman edit video',
                error: error
            });
        }
    }

    static uploadVideoMulter = upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]);

    static async uploadVideo(req, res) {
        try {
            const { title, description, tags, category_id, series_id, episode_number } = req.body;
            
            if (!title || !req.files || !req.files.video) {
                return res.status(400).json({
                    success: false,
                    message: 'Judul dan file video harus diisi'
                });
            }

            const videoFile = req.files.video[0];
            const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

            // Generate unique keys for Wasabi
            const videoKey = wasabiService.generateFileKey(videoFile.originalname, 'videos');
            const thumbnailKey = thumbnailFile ? 
                wasabiService.generateFileKey(thumbnailFile.originalname, 'thumbnails') : 
                wasabiService.generateThumbnailKey(videoKey);

            // Upload video to Wasabi
            console.log('Uploading video to Wasabi...');
            const videoUploadResult = await wasabiService.uploadVideo(videoFile, videoKey, (percent) => {
                // TODO: Emit progress to client via WebSocket
                console.log(`Upload progress: ${percent}%`);
            });

            if (!videoUploadResult.success) {
                throw new Error('Failed to upload video');
            }

            // Upload or generate thumbnail
            let thumbnailUrl = null;
            if (thumbnailFile) {
                const thumbnailUploadResult = await wasabiService.uploadFile(thumbnailFile, thumbnailKey);
                if (thumbnailUploadResult.success) {
                    thumbnailUrl = thumbnailUploadResult.url;
                }
            } else {
                // TODO: Generate thumbnail from video using ffmpeg
                thumbnailUrl = await this.generateVideoThumbnail(videoUploadResult.url, thumbnailKey);
            }

            // Extract video metadata
            const videoMetadata = await this.extractVideoMetadata(videoFile);

            // Save video record to database
            const videoId = await VideoManagementModel.createVideoRecord({
                title,
                description,
                filename: videoFile.originalname,
                file_path: videoUploadResult.url, // For backward compatibility
                file_url: videoUploadResult.url,
                file_key: videoKey,
                thumbnail: thumbnailUrl,
                duration: videoMetadata.duration || 0,
                tags,
                category_id: category_id || null,
                series_id: series_id || null,
                episode_number: episode_number || null,
                file_size: videoFile.size,
                video_width: videoMetadata.width,
                video_height: videoMetadata.height,
                fps: videoMetadata.fps,
                bitrate: videoMetadata.bitrate,
                codec: videoMetadata.codec,
                status: 'published'
            });

            res.json({
                success: true,
                message: 'Video berhasil diupload',
                videoId,
                videoUrl: videoUploadResult.url,
                thumbnailUrl
            });
        } catch (error) {
            console.error('Upload video error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupload video: ' + error.message
            });
        }
    }

    static async updateVideo(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            const { title, description, tags, category_id, series_id, episode_number, status } = req.body;

            const video = await VideoManagementModel.getVideoById(videoId);
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video tidak ditemukan'
                });
            }

            // Handle thumbnail upload if provided
            let thumbnailUrl = video.thumbnail;
            if (req.files && req.files.thumbnail) {
                const thumbnailFile = req.files.thumbnail[0];
                const thumbnailKey = wasabiService.generateFileKey(thumbnailFile.originalname, 'thumbnails');
                const uploadResult = await wasabiService.uploadFile(thumbnailFile, thumbnailKey);
                if (uploadResult.success) {
                    thumbnailUrl = uploadResult.url;
                }
            }

            const success = await VideoManagementModel.updateVideoRecord(videoId, {
                title,
                description,
                thumbnail: thumbnailUrl,
                tags,
                category_id: category_id || null,
                series_id: series_id || null,
                episode_number: episode_number || null,
                status
            });

            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.json({
                    success,
                    message: success ? 'Video berhasil diupdate' : 'Gagal mengupdate video'
                });
            } else {
                res.redirect('/admin/videos');
            }
        } catch (error) {
            console.error('Update video error:', error);
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                res.status(500).json({
                    success: false,
                    message: 'Gagal mengupdate video'
                });
            } else {
                res.status(500).render('admin/error', {
                    message: 'Gagal mengupdate video',
                    error: error
                });
            }
        }
    }

    static async deleteVideo(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            
            const result = await VideoManagementModel.deleteVideoRecord(videoId);
            if (!result.success) {
                return res.status(404).json({
                    success: false,
                    message: 'Video tidak ditemukan'
                });
            }

            // Delete file from Wasabi
            if (result.fileKey) {
                try {
                    await wasabiService.deleteFile(result.fileKey);
                } catch (deleteError) {
                    console.error('Error deleting file from Wasabi:', deleteError);
                    // Don't fail the whole operation if file deletion fails
                }
            }

            res.json({
                success: true,
                message: 'Video berhasil dihapus'
            });
        } catch (error) {
            console.error('Delete video error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal menghapus video'
            });
        }
    }

    static async bulkUpdateVideos(req, res) {
        try {
            const { action, videoIds } = req.body;
            
            if (!action || !videoIds || !Array.isArray(videoIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Action dan video IDs harus disediakan'
                });
            }

            let result;
            switch (action) {
                case 'publish':
                    result = await VideoManagementModel.bulkUpdateStatus(videoIds, 'published');
                    break;
                case 'draft':
                    result = await VideoManagementModel.bulkUpdateStatus(videoIds, 'draft');
                    break;
                case 'archive':
                    result = await VideoManagementModel.bulkUpdateStatus(videoIds, 'archived');
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Action tidak valid'
                    });
            }

            res.json({
                success: true,
                message: `${result} video berhasil diupdate`,
                updatedCount: result
            });
        } catch (error) {
            console.error('Bulk update videos error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengupdate video'
            });
        }
    }

    // ===== ANALYTICS =====
    static async analyticsPage(req, res) {
        try {
            const period = req.query.period || 'week';
            const topVideos = await AnalyticsModel.getTopVideos(period, 20);
            const categoryPerformance = await AnalyticsModel.getCategoryPerformance();
            const uploadTrends = await AnalyticsModel.getUploadTrends(30);

            res.render('admin/analytics', {
                title: 'Analytics',
                admin: req.admin,
                topVideos,
                categoryPerformance,
                uploadTrends,
                selectedPeriod: period
            });
        } catch (error) {
            console.error('Analytics page error:', error);
            res.status(500).render('admin/error', {
                message: 'Gagal memuat halaman analytics',
                error: error
            });
        }
    }

    static async getAnalyticsAPI(req, res) {
        try {
            const { type, period, videoId } = req.query;
            
            let data;
            switch (type) {
                case 'dashboard':
                    data = await AnalyticsModel.getDashboardStats();
                    break;
                case 'top-videos':
                    data = await AnalyticsModel.getTopVideos(period || 'week', 10);
                    break;
                case 'category-performance':
                    data = await AnalyticsModel.getCategoryPerformance();
                    break;
                case 'upload-trends':
                    data = await AnalyticsModel.getUploadTrends(parseInt(period) || 30);
                    break;
                case 'video-analytics':
                    if (!videoId) {
                        return res.status(400).json({
                            success: false,
                            message: 'Video ID diperlukan'
                        });
                    }
                    data = await AnalyticsModel.getVideoAnalytics(videoId, parseInt(period) || 30);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Tipe analytics tidak valid'
                    });
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Analytics API error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil data analytics'
            });
        }
    }

    // ===== UTILITY METHODS =====
    static async generateVideoThumbnail(videoUrl, thumbnailKey) {
        return new Promise((resolve, reject) => {
            try {
                // TODO: Implement thumbnail generation using ffmpeg
                // This is a placeholder implementation
                ffmpeg(videoUrl)
                    .screenshots({
                        timestamps: ['50%'],
                        filename: 'thumbnail.png',
                        folder: '/tmp/',
                        size: '320x240'
                    })
                    .on('end', async () => {
                        try {
                            // Upload generated thumbnail to Wasabi
                            const fs = require('fs');
                            const thumbnailBuffer = fs.readFileSync('/tmp/thumbnail.png');
                            const uploadResult = await wasabiService.uploadFile(
                                { buffer: thumbnailBuffer, mimetype: 'image/png' },
                                thumbnailKey
                            );
                            
                            // Clean up temp file
                            fs.unlinkSync('/tmp/thumbnail.png');
                            
                            resolve(uploadResult.success ? uploadResult.url : null);
                        } catch (uploadError) {
                            console.error('Thumbnail upload error:', uploadError);
                            resolve(null);
                        }
                    })
                    .on('error', (err) => {
                        console.error('Thumbnail generation error:', err);
                        resolve(null);
                    });
            } catch (error) {
                console.error('Thumbnail generation setup error:', error);
                resolve(null);
            }
        });
    }

    static async extractVideoMetadata(videoFile) {
        return new Promise((resolve) => {
            try {
                // TODO: Implement video metadata extraction using ffprobe
                // This is a placeholder implementation
                ffmpeg.ffprobe(videoFile.buffer, (err, metadata) => {
                    if (err) {
                        console.error('Metadata extraction error:', err);
                        resolve({});
                        return;
                    }

                    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                    if (videoStream) {
                        resolve({
                            duration: Math.round(metadata.format.duration || 0),
                            width: videoStream.width,
                            height: videoStream.height,
                            fps: eval(videoStream.r_frame_rate) || null,
                            bitrate: parseInt(metadata.format.bit_rate) || null,
                            codec: videoStream.codec_name
                        });
                    } else {
                        resolve({});
                    }
                });
            } catch (error) {
                console.error('Metadata extraction setup error:', error);
                resolve({});
            }
        });
    }

    // ===== WASABI INTEGRATION =====
    static async generateUploadUrl(req, res) {
        try {
            const { filename, contentType } = req.body;
            
            if (!filename || !contentType) {
                return res.status(400).json({
                    success: false,
                    message: 'Filename dan content type harus disediakan'
                });
            }

            const key = wasabiService.generateFileKey(filename, 'videos');
            const result = await wasabiService.generatePresignedUploadUrl(key, contentType);

            res.json(result);
        } catch (error) {
            console.error('Generate upload URL error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal generate upload URL'
            });
        }
    }

    static async getStorageStats(req, res) {
        try {
            const stats = await wasabiService.getStorageStats();
            res.json(stats);
        } catch (error) {
            console.error('Storage stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil statistik storage'
            });
        }
    }
}

module.exports = AdminController;