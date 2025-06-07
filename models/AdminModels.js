// models/AdminModels.js
const db = require('../config/database');

// ===== CATEGORY MODEL =====
class CategoryModel {
    static async getAllCategories(includeInactive = false) {
        try {
            let sql = 'SELECT * FROM categories';
            if (!includeInactive) {
                sql += ' WHERE is_active = 1';
            }
            sql += ' ORDER BY sort_order ASC, name ASC';
            
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getAllCategories:', error);
            throw error;
        }
    }

    static async getCategoryById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getCategoryById:', error);
            throw error;
        }
    }

    static async getCategoryBySlug(slug) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM categories WHERE slug = ?',
                [slug]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getCategoryBySlug:', error);
            throw error;
        }
    }

    static async createCategory(categoryData) {
        try {
            const { name, description, slug, image, color } = categoryData;
            const [result] = await db.execute(
                `INSERT INTO categories (name, description, slug, image, color) 
                 VALUES (?, ?, ?, ?, ?)`,
                [name, description, slug, image, color]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in createCategory:', error);
            throw error;
        }
    }

    static async updateCategory(id, categoryData) {
        try {
            const { name, description, slug, image, color, is_active, sort_order } = categoryData;
            const [result] = await db.execute(
                `UPDATE categories SET 
                    name = ?, description = ?, slug = ?, image = ?, color = ?, 
                    is_active = ?, sort_order = ?, updated_at = NOW()
                 WHERE id = ?`,
                [name, description, slug, image, color, is_active, sort_order, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateCategory:', error);
            throw error;
        }
    }

    static async deleteCategory(id) {
        try {
            const [result] = await db.execute(
                'DELETE FROM categories WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in deleteCategory:', error);
            throw error;
        }
    }

    static async getCategoryWithStats(id) {
        try {
            const [rows] = await db.execute(`
                SELECT c.*, 
                       COUNT(v.id) as video_count,
                       SUM(v.views) as total_views,
                       SUM(v.likes) as total_likes
                FROM categories c
                LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                WHERE c.id = ?
                GROUP BY c.id
            `, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error in getCategoryWithStats:', error);
            throw error;
        }
    }

    static async getCategoriesWithStats() {
        try {
            const [rows] = await db.execute(`
                SELECT c.*, 
                       COUNT(v.id) as video_count,
                       SUM(v.views) as total_views,
                       SUM(v.likes) as total_likes
                FROM categories c
                LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                WHERE c.is_active = 1
                GROUP BY c.id
                ORDER BY c.sort_order ASC, c.name ASC
            `);
            return rows;
        } catch (error) {
            console.error('Error in getCategoriesWithStats:', error);
            throw error;
        }
    }
}

// ===== SERIES MODEL =====
class SeriesModel {
    static async getAllSeries(categoryId = null, includeInactive = false) {
        try {
            let sql = `
                SELECT s.*, c.name as category_name, c.color as category_color
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
            `;
            const params = [];
            const conditions = [];

            if (categoryId) {
                conditions.push('s.category_id = ?');
                params.push(categoryId);
            }

            if (!includeInactive) {
                conditions.push('s.is_active = 1');
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY s.created_at DESC';

            const [rows] = await db.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Error in getAllSeries:', error);
            throw error;
        }
    }

    static async getSeriesById(id) {
        try {
            const [rows] = await db.execute(`
                SELECT s.*, c.name as category_name, c.color as category_color
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.id = ?
            `, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error in getSeriesById:', error);
            throw error;
        }
    }

    static async getSeriesBySlug(slug) {
        try {
            const [rows] = await db.execute(`
                SELECT s.*, c.name as category_name, c.color as category_color
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.slug = ?
            `, [slug]);
            return rows[0];
        } catch (error) {
            console.error('Error in getSeriesBySlug:', error);
            throw error;
        }
    }

    static async createSeries(seriesData) {
        try {
            const { title, description, slug, thumbnail, category_id } = seriesData;
            const [result] = await db.execute(
                `INSERT INTO series (title, description, slug, thumbnail, category_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [title, description, slug, thumbnail, category_id]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in createSeries:', error);
            throw error;
        }
    }

    static async updateSeries(id, seriesData) {
        try {
            const { title, description, slug, thumbnail, category_id, is_active } = seriesData;
            const [result] = await db.execute(
                `UPDATE series SET 
                    title = ?, description = ?, slug = ?, thumbnail = ?, 
                    category_id = ?, is_active = ?, updated_at = NOW()
                 WHERE id = ?`,
                [title, description, slug, thumbnail, category_id, is_active, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateSeries:', error);
            throw error;
        }
    }

    static async deleteSeries(id) {
        try {
            const [result] = await db.execute(
                'DELETE FROM series WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in deleteSeries:', error);
            throw error;
        }
    }

    static async getSeriesWithVideos(id) {
        try {
            const series = await this.getSeriesById(id);
            if (!series) return null;

            const [videos] = await db.execute(`
                SELECT * FROM videos 
                WHERE series_id = ? AND status = 'published'
                ORDER BY episode_number ASC, created_at ASC
            `, [id]);

            return {
                ...series,
                videos: videos
            };
        } catch (error) {
            console.error('Error in getSeriesWithVideos:', error);
            throw error;
        }
    }

    static async updateSeriesStats(seriesId) {
        try {
            const [result] = await db.execute(`
                UPDATE series s SET 
                    total_videos = (
                        SELECT COUNT(*) FROM videos v 
                        WHERE v.series_id = s.id AND v.status = 'published'
                    ),
                    total_duration = (
                        SELECT COALESCE(SUM(v.duration), 0) FROM videos v 
                        WHERE v.series_id = s.id AND v.status = 'published'
                    ),
                    total_views = (
                        SELECT COALESCE(SUM(v.views), 0) FROM videos v 
                        WHERE v.series_id = s.id AND v.status = 'published'
                    )
                WHERE s.id = ?
            `, [seriesId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateSeriesStats:', error);
            throw error;
        }
    }
}

// ===== ADMIN USER MODEL =====
class AdminUserModel {
    static async getAdminByUsername(username) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
                [username]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getAdminByUsername:', error);
            throw error;
        }
    }

    static async getAdminById(id) {
        try {
            const [rows] = await db.execute(
                'SELECT id, username, email, full_name, role, avatar, is_active, last_login, created_at FROM admin_users WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getAdminById:', error);
            throw error;
        }
    }

    static async updateLastLogin(id) {
        try {
            await db.execute(
                'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
                [id]
            );
        } catch (error) {
            console.error('Error in updateLastLogin:', error);
            throw error;
        }
    }

    static async createSession(sessionId, adminId, expiresAt) {
        try {
            await db.execute(
                'INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES (?, ?, ?)',
                [sessionId, adminId, expiresAt]
            );
        } catch (error) {
            console.error('Error in createSession:', error);
            throw error;
        }
    }

    static async getSession(sessionId) {
        try {
            const [rows] = await db.execute(`
                SELECT s.*, a.username, a.role, a.full_name 
                FROM admin_sessions s
                JOIN admin_users a ON s.admin_id = a.id
                WHERE s.id = ? AND s.expires_at > NOW() AND a.is_active = 1
            `, [sessionId]);
            return rows[0];
        } catch (error) {
            console.error('Error in getSession:', error);
            throw error;
        }
    }

    static async deleteSession(sessionId) {
        try {
            await db.execute(
                'DELETE FROM admin_sessions WHERE id = ?',
                [sessionId]
            );
        } catch (error) {
            console.error('Error in deleteSession:', error);
            throw error;
        }
    }

    static async cleanExpiredSessions() {
        try {
            await db.execute(
                'DELETE FROM admin_sessions WHERE expires_at < NOW()'
            );
        } catch (error) {
            console.error('Error in cleanExpiredSessions:', error);
            throw error;
        }
    }
}

// ===== ANALYTICS MODEL =====
class AnalyticsModel {
    static async getDashboardStats() {
        try {
            // Total statistics
            const [totalStats] = await db.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM videos WHERE status = 'published') as total_videos,
                    (SELECT COUNT(*) FROM categories WHERE is_active = 1) as total_categories,
                    (SELECT COUNT(*) FROM series WHERE is_active = 1) as total_series,
                    (SELECT COALESCE(SUM(views), 0) FROM videos WHERE status = 'published') as total_views,
                    (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE status = 'published') as total_likes,
                    (SELECT COUNT(*) FROM videos WHERE status = 'published' AND DATE(created_at) = CURDATE()) as today_uploads
            `);

            // Popular videos (last 7 days)
            const [popularVideos] = await db.execute(`
                SELECT v.id, v.title, v.thumbnail, v.views, v.likes, v.duration,
                       c.name as category_name, c.color as category_color
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                WHERE v.status = 'published' AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY v.views DESC, v.likes DESC
                LIMIT 10
            `);

            // Recent uploads
            const [recentVideos] = await db.execute(`
                SELECT v.id, v.title, v.thumbnail, v.status, v.created_at,
                       c.name as category_name
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                ORDER BY v.created_at DESC
                LIMIT 5
            `);

            // Views trend (last 30 days)
            const [viewsTrend] = await db.execute(`
                SELECT DATE(created_at) as date, 
                       COUNT(*) as uploads,
                       COALESCE(SUM(views), 0) as views
                FROM videos 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Category statistics
            const [categoryStats] = await db.execute(`
                SELECT c.name, c.color, 
                       COUNT(v.id) as video_count,
                       COALESCE(SUM(v.views), 0) as total_views
                FROM categories c
                LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                WHERE c.is_active = 1
                GROUP BY c.id, c.name, c.color
                ORDER BY total_views DESC
            `);

            return {
                totalStats: totalStats[0],
                popularVideos,
                recentVideos,
                viewsTrend,
                categoryStats
            };
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            throw error;
        }
    }

    static async getVideoAnalytics(videoId, days = 30) {
        try {
            const [videoStats] = await db.execute(`
                SELECT DATE(created_at) as date,
                       views, likes, created_at
                FROM videos 
                WHERE id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [videoId, days]);

            // Daily view stats (if exists)
            const [dailyStats] = await db.execute(`
                SELECT date, views, likes, shares, watch_time
                FROM video_stats 
                WHERE video_id = ? AND date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY date ASC
            `, [videoId, days]);

            return {
                videoStats: videoStats[0],
                dailyStats
            };
        } catch (error) {
            console.error('Error in getVideoAnalytics:', error);
            throw error;
        }
    }

    static async updateVideoStats(videoId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Get current video data
            const [video] = await db.execute(
                'SELECT views, likes FROM videos WHERE id = ?',
                [videoId]
            );

            if (video.length === 0) return;

            // Update or insert daily stats
            await db.execute(`
                INSERT INTO video_stats (video_id, date, views, likes)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                views = VALUES(views),
                likes = VALUES(likes),
                updated_at = NOW()
            `, [videoId, today, video[0].views, video[0].likes]);

        } catch (error) {
            console.error('Error in updateVideoStats:', error);
            throw error;
        }
    }

    static async getTopVideos(period = 'week', limit = 10) {
        try {
            let whereClause = '';
            switch (period) {
                case 'today':
                    whereClause = 'AND v.created_at >= CURDATE()';
                    break;
                case 'week':
                    whereClause = 'AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    whereClause = 'AND v.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    whereClause = 'AND v.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
                default:
                    whereClause = '';
            }

            const [rows] = await db.execute(`
                SELECT v.id, v.title, v.thumbnail, v.views, v.likes, v.duration, v.created_at,
                       c.name as category_name, c.color as category_color,
                       s.title as series_title
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                WHERE v.status = 'published' ${whereClause}
                ORDER BY v.views DESC, v.likes DESC
                LIMIT ?
            `, [limit]);

            return rows;
        } catch (error) {
            console.error('Error in getTopVideos:', error);
            throw error;
        }
    }

    static async getCategoryPerformance() {
        try {
            const [rows] = await db.execute(`
                SELECT c.id, c.name, c.color,
                       COUNT(v.id) as video_count,
                       COALESCE(SUM(v.views), 0) as total_views,
                       COALESCE(SUM(v.likes), 0) as total_likes,
                       COALESCE(AVG(v.views), 0) as avg_views,
                       COALESCE(SUM(v.duration), 0) as total_duration
                FROM categories c
                LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                WHERE c.is_active = 1
                GROUP BY c.id, c.name, c.color
                ORDER BY total_views DESC
            `);

            return rows;
        } catch (error) {
            console.error('Error in getCategoryPerformance:', error);
            throw error;
        }
    }

    static async getUploadTrends(days = 30) {
        try {
            const [rows] = await db.execute(`
                SELECT DATE(created_at) as date,
                       COUNT(*) as uploads,
                       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
                       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts
                FROM videos 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [days]);

            return rows;
        } catch (error) {
            console.error('Error in getUploadTrends:', error);
            throw error;
        }
    }
}

// ===== VIDEO MODEL EXTENSIONS =====
class VideoManagementModel {
    static async getAllVideosForAdmin(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            let whereConditions = [];
            let params = [];

            // Build filters
            if (filters.status) {
                whereConditions.push('v.status = ?');
                params.push(filters.status);
            }

            if (filters.category_id) {
                whereConditions.push('v.category_id = ?');
                params.push(filters.category_id);
            }

            if (filters.series_id) {
                whereConditions.push('v.series_id = ?');
                params.push(filters.series_id);
            }

            if (filters.search) {
                whereConditions.push('(v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? 
                'WHERE ' + whereConditions.join(' AND ') : '';

            // Get videos
            const [videos] = await db.execute(`
                SELECT v.*, 
                       c.name as category_name, c.color as category_color,
                       s.title as series_title
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                ${whereClause}
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            // Get total count
            const [countResult] = await db.execute(`
                SELECT COUNT(*) as total
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                ${whereClause}
            `, params);

            return {
                videos,
                total: countResult[0].total,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].total / limit)
            };
        } catch (error) {
            console.error('Error in getAllVideosForAdmin:', error);
            throw error;
        }
    }

    static async updateVideoStatus(id, status) {
        try {
            const [result] = await db.execute(
                'UPDATE videos SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateVideoStatus:', error);
            throw error;
        }
    }

    static async createVideoRecord(videoData) {
        try {
            const {
                title, description, filename, file_path, file_url, file_key,
                thumbnail, duration, tags, category_id, series_id, episode_number,
                file_size, video_width, video_height, fps, bitrate, codec, status
            } = videoData;

            const [result] = await db.execute(`
                INSERT INTO videos (
                    title, description, filename, file_path, file_url, file_key,
                    thumbnail, duration, tags, category_id, series_id, episode_number,
                    file_size, video_width, video_height, fps, bitrate, codec, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                title, description, filename, file_path, file_url, file_key,
                thumbnail, duration, tags, category_id, series_id, episode_number,
                file_size, video_width, video_height, fps, bitrate, codec, status || 'draft'
            ]);

            // Update series stats if video belongs to a series
            if (series_id) {
                await SeriesModel.updateSeriesStats(series_id);
            }

            return result.insertId;
        } catch (error) {
            console.error('Error in createVideoRecord:', error);
            throw error;
        }
    }

    static async updateVideoRecord(id, videoData) {
        try {
            const {
                title, description, thumbnail, tags, category_id, 
                series_id, episode_number, status
            } = videoData;

            const [result] = await db.execute(`
                UPDATE videos SET 
                    title = ?, description = ?, thumbnail = ?, tags = ?,
                    category_id = ?, series_id = ?, episode_number = ?, status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                title, description, thumbnail, tags, 
                category_id, series_id, episode_number, status, id
            ]);

            // Update series stats if needed
            if (series_id) {
                await SeriesModel.updateSeriesStats(series_id);
            }

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateVideoRecord:', error);
            throw error;
        }
    }

    static async deleteVideoRecord(id) {
        try {
            // Get video info first
            const [video] = await db.execute(
                'SELECT series_id, file_key FROM videos WHERE id = ?',
                [id]
            );

            if (video.length === 0) return false;

            const seriesId = video[0].series_id;

            // Delete video record
            const [result] = await db.execute(
                'DELETE FROM videos WHERE id = ?',
                [id]
            );

            // Update series stats if needed
            if (seriesId) {
                await SeriesModel.updateSeriesStats(seriesId);
            }

            return {
                success: result.affectedRows > 0,
                fileKey: video[0].file_key
            };
        } catch (error) {
            console.error('Error in deleteVideoRecord:', error);
            throw error;
        }
    }

    static async getVideosByStatus(status, limit = 10) {
        try {
            const [rows] = await db.execute(`
                SELECT v.*, c.name as category_name, s.title as series_title
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                WHERE v.status = ?
                ORDER BY v.created_at DESC
                LIMIT ?
            `, [status, limit]);

            return rows;
        } catch (error) {
            console.error('Error in getVideosByStatus:', error);
            throw error;
        }
    }

    static async bulkUpdateStatus(videoIds, status) {
        try {
            const placeholders = videoIds.map(() => '?').join(',');
            const [result] = await db.execute(`
                UPDATE videos SET status = ?, updated_at = NOW() 
                WHERE id IN (${placeholders})
            `, [status, ...videoIds]);

            return result.affectedRows;
        } catch (error) {
            console.error('Error in bulkUpdateStatus:', error);
            throw error;
        }
    }
}

module.exports = {
    CategoryModel,
    SeriesModel,
    AdminUserModel,
    AnalyticsModel,
    VideoManagementModel
};