const db = require('../config/database');

class VideoModel {
    // Mendapatkan semua video dengan pagination
    static async getAllVideos(limit = 10, offset = 0) {
        try {
            // Pastikan limit dan offset adalah integer dan aman
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            // Gunakan query string dengan values yang sudah di-escape
            const sql = `SELECT * FROM videos ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Mendapatkan video berdasarkan ID
    static async getVideoById(id) {
        try {
            // Pastikan id adalah integer
            const videoId = parseInt(id);
            if (!videoId) {
                throw new Error('Invalid video ID');
            }
            
            const [rows] = await db.execute(
                'SELECT * FROM videos WHERE id = ?',
                [videoId]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Mencari video berdasarkan judul atau tags
    static async searchVideos(query, limit = 10, offset = 0) {
        try {
            // Pastikan limit dan offset adalah integer dan aman
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const searchQuery = `%${query}%`;
            const [rows] = await db.execute(
                `SELECT * FROM videos WHERE title LIKE ? OR tags LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`,
                [searchQuery, searchQuery, searchQuery]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Menambah video baru
    static async createVideo(videoData) {
        try {
            const { title, description, filename, file_path, thumbnail, duration, tags } = videoData;
            const [result] = await db.execute(
                'INSERT INTO videos (title, description, filename, file_path, thumbnail, duration, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [title, description, filename, file_path, thumbnail, duration, tags]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    // Update views count
    static async incrementViews(id) {
        try {
            // Pastikan id adalah integer
            const videoId = parseInt(id);
            if (!videoId) {
                throw new Error('Invalid video ID');
            }
            
            await db.execute(
                'UPDATE videos SET views = views + 1 WHERE id = ?',
                [videoId]
            );
        } catch (error) {
            throw error;
        }
    }

    // Update likes count
    static async incrementLikes(id) {
        try {
            // Pastikan id adalah integer
            const videoId = parseInt(id);
            if (!videoId) {
                throw new Error('Invalid video ID');
            }
            
            await db.execute(
                'UPDATE videos SET likes = likes + 1 WHERE id = ?',
                [videoId]
            );
        } catch (error) {
            throw error;
        }
    }

    // Mendapatkan total count untuk pagination
    static async getTotalCount() {
        try {
            const [rows] = await db.execute('SELECT COUNT(*) as total FROM videos');
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    // Mendapatkan count hasil pencarian
    static async getSearchCount(query) {
        try {
            const searchQuery = `%${query}%`;
            const [rows] = await db.execute(
                'SELECT COUNT(*) as total FROM videos WHERE title LIKE ? OR tags LIKE ? OR description LIKE ?',
                [searchQuery, searchQuery, searchQuery]
            );
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    }

    // Mendapatkan video trending (berdasarkan views)
    static async getTrendingVideos(limit = 5) {
        try {
            // Pastikan limit adalah integer dan aman
            const limitInt = Math.max(1, Math.min(50, parseInt(limit) || 5));
            
            const sql = `SELECT * FROM videos ORDER BY views DESC LIMIT ${limitInt}`;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = VideoModel;