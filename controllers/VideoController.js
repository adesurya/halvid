const VideoModel = require('../models/VideoModel');

class VideoController {
    // Halaman utama - menampilkan semua video
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            // Validasi parameter
            if (page < 1) {
                return res.redirect('/');
            }

            const videos = await VideoModel.getAllVideos(limit, offset);
            const totalVideos = await VideoModel.getTotalCount();
            const totalPages = Math.ceil(totalVideos / limit);
            const trendingVideos = await VideoModel.getTrendingVideos(5);

            res.render('index', {
                videos,
                trendingVideos,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                query: null
            });
        } catch (error) {
            console.error('Error in index:', error);
            res.status(500).render('error', { message: 'Terjadi kesalahan saat memuat video' });
        }
    }

    // Menampilkan detail video
    static async show(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            
            // Validasi video ID
            if (!videoId || videoId < 1) {
                return res.status(404).render('error', { message: 'Video tidak ditemukan' });
            }
            
            const video = await VideoModel.getVideoById(videoId);

            if (!video) {
                return res.status(404).render('error', { message: 'Video tidak ditemukan' });
            }

            // Increment views
            await VideoModel.incrementViews(videoId);
            video.views += 1;

            // Get related videos (same tags)
            const relatedVideos = await VideoModel.searchVideos(video.tags || '', 4, 0);
            const filteredRelated = relatedVideos.filter(v => v.id !== video.id);

            res.render('video-detail', {
                video,
                relatedVideos: filteredRelated
            });
        } catch (error) {
            console.error('Error in show:', error);
            res.status(500).render('error', { message: 'Terjadi kesalahan saat memuat video' });
        }
    }

    // Pencarian video
    static async search(req, res) {
        try {
            const query = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            if (!query.trim()) {
                return res.redirect('/');
            }

            // Validasi parameter
            if (page < 1) {
                return res.redirect(`/search?q=${encodeURIComponent(query)}`);
            }

            const videos = await VideoModel.searchVideos(query, limit, offset);
            const totalVideos = await VideoModel.getSearchCount(query);
            const totalPages = Math.ceil(totalVideos / limit);

            res.render('search-results', {
                videos,
                query,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                totalResults: totalVideos
            });
        } catch (error) {
            console.error('Error in search:', error);
            res.status(500).render('error', { message: 'Terjadi kesalahan saat mencari video' });
        }
    }

    // Like video (AJAX endpoint)
    static async like(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            
            // Validasi video ID
            if (!videoId || videoId < 1) {
                return res.status(400).json({ success: false, message: 'ID video tidak valid' });
            }
            
            await VideoModel.incrementLikes(videoId);
            
            const video = await VideoModel.getVideoById(videoId);
            if (!video) {
                return res.status(404).json({ success: false, message: 'Video tidak ditemukan' });
            }
            
            res.json({ success: true, likes: video.likes });
        } catch (error) {
            console.error('Error in like:', error);
            res.status(500).json({ success: false, message: 'Gagal memberikan like' });
        }
    }

    // API endpoint untuk mendapatkan video (untuk AJAX)
    static async getVideosAPI(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            // Validasi parameter
            if (page < 1 || limit < 1 || limit > 50) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Parameter tidak valid' 
                });
            }

            const videos = await VideoModel.getAllVideos(limit, offset);
            const totalVideos = await VideoModel.getTotalCount();

            res.json({
                success: true,
                videos,
                totalVideos,
                currentPage: page,
                totalPages: Math.ceil(totalVideos / limit)
            });
        } catch (error) {
            console.error('Error in getVideosAPI:', error);
            res.status(500).json({ success: false, message: 'Gagal memuat video' });
        }
    }
}

module.exports = VideoController;