const VideoModel = require('../models/VideoModel');

class VideoController {
    // Halaman utama dengan tampilan TikTok-style
    static async index(req, res) {
        try {
            // Check if request is for API (AJAX)
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return this.getVideosAPI(req, res);
            }

            // Render TikTok-style landing page
            res.render('tiktok-index', {
                title: 'ShortVideo - Platform Video Pendek'
            });
        } catch (error) {
            console.error('Error in index:', error);
            res.status(500).render('error', { message: 'Terjadi kesalahan saat memuat halaman' });
        }
    }

    // API endpoint untuk mendapatkan video random berdasarkan views
    static async getVideosAPI(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const sortBy = req.query.sort || 'random'; // random, views, likes, latest

            // Validasi parameter
            if (page < 1 || limit < 1 || limit > 50) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Parameter tidak valid' 
                });
            }

            let videos;
            let totalVideos;

            switch (sortBy) {
                case 'views':
                    videos = await VideoModel.getVideosByViews(limit, offset);
                    totalVideos = await VideoModel.getTotalCount();
                    break;
                case 'likes':
                    videos = await VideoModel.getVideosByLikes(limit, offset);
                    totalVideos = await VideoModel.getTotalCount();
                    break;
                case 'latest':
                    videos = await VideoModel.getAllVideos(limit, offset);
                    totalVideos = await VideoModel.getTotalCount();
                    break;
                case 'random':
                default:
                    videos = await VideoModel.getRandomVideos(limit);
                    totalVideos = await VideoModel.getTotalCount();
                    break;
            }

            // Format video data for TikTok-style display
            const formattedVideos = videos.map(video => ({
                id: video.id,
                title: video.title,
                description: video.description,
                videoUrl: video.file_path,
                thumbnail: video.thumbnail || '/images/default-thumbnail.jpg',
                views: video.views,
                likes: video.likes,
                tags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
                duration: video.duration,
                createdAt: video.created_at
            }));

            res.json({
                success: true,
                videos: formattedVideos,
                totalVideos,
                currentPage: page,
                totalPages: Math.ceil(totalVideos / limit),
                hasMore: page * limit < totalVideos
            });
        } catch (error) {
            console.error('Error in getVideosAPI:', error);
            res.status(500).json({ success: false, message: 'Gagal memuat video' });
        }
    }

    // Halaman utama versi lama (grid view)
    static async indexGrid(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            // Validasi parameter
            if (page < 1) {
                return res.redirect('/grid');
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
            console.error('Error in indexGrid:', error);
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

            // Check if request is for API (AJAX)
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                const videos = await VideoModel.searchVideos(query, limit, offset);
                const totalVideos = await VideoModel.getSearchCount(query);

                const formattedVideos = videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    videoUrl: video.file_path,
                    thumbnail: video.thumbnail || '/images/default-thumbnail.jpg',
                    views: video.views,
                    likes: video.likes,
                    tags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
                    duration: video.duration,
                    createdAt: video.created_at
                }));

                return res.json({
                    success: true,
                    videos: formattedVideos,
                    query,
                    totalResults: totalVideos,
                    currentPage: page,
                    totalPages: Math.ceil(totalVideos / limit)
                });
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

    // Unlike video (AJAX endpoint)
    static async unlike(req, res) {
        try {
            const videoId = parseInt(req.params.id);
            
            // Validasi video ID
            if (!videoId || videoId < 1) {
                return res.status(400).json({ success: false, message: 'ID video tidak valid' });
            }
            
            await VideoModel.decrementLikes(videoId);
            
            const video = await VideoModel.getVideoById(videoId);
            if (!video) {
                return res.status(404).json({ success: false, message: 'Video tidak ditemukan' });
            }
            
            res.json({ success: true, likes: video.likes });
        } catch (error) {
            console.error('Error in unlike:', error);
            res.status(500).json({ success: false, message: 'Gagal menghapus like' });
        }
    }

    // Get trending videos
    static async getTrending(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const videos = await VideoModel.getTrendingVideos(limit);

            const formattedVideos = videos.map(video => ({
                id: video.id,
                title: video.title,
                description: video.description,
                videoUrl: video.file_path,
                thumbnail: video.thumbnail || '/images/default-thumbnail.jpg',
                views: video.views,
                likes: video.likes,
                tags: video.tags ? video.tags.split(',').map(tag => tag.trim()) : [],
                duration: video.duration,
                createdAt: video.created_at
            }));

            res.json({
                success: true,
                videos: formattedVideos
            });
        } catch (error) {
            console.error('Error in getTrending:', error);
            res.status(500).json({ success: false, message: 'Gagal memuat video trending' });
        }
    }

    // Auto-complete search suggestions
    static async searchSuggestions(req, res) {
        try {
            const query = req.query.q || '';
            
            if (query.length < 2) {
                return res.json({ success: true, suggestions: [] });
            }

            // Get search suggestions based on video titles and tags
            const suggestions = await VideoModel.getSearchSuggestions(query, 5);
            
            res.json({
                success: true,
                suggestions: suggestions.map(item => ({
                    text: item.suggestion,
                    type: item.type, // 'title' or 'tag'
                    count: item.count
                }))
            });
        } catch (error) {
            console.error('Error in searchSuggestions:', error);
            res.status(500).json({ success: false, message: 'Gagal memuat saran pencarian' });
        }
    }
}

module.exports = VideoController;