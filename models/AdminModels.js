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
            // Pastikan tabel ada sebelum query
            await this.ensureTablesExist();

            // Total statistics - dengan error handling
            const [totalStats] = await db.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM videos WHERE status = 'published') as total_videos,
                    (SELECT COUNT(*) FROM categories WHERE is_active = 1) as total_categories,
                    (SELECT COUNT(*) FROM series WHERE is_active = 1) as total_series,
                    (SELECT COALESCE(SUM(views), 0) FROM videos WHERE status = 'published') as total_views,
                    (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE status = 'published') as total_likes,
                    (SELECT COUNT(*) FROM videos WHERE status = 'published' AND DATE(created_at) = CURDATE()) as today_uploads
            `);

            // Popular videos (last 7 days) - dengan fallback
            let popularVideos = [];
            try {
                const [popularResult] = await db.execute(`
                    SELECT v.id, v.title, v.thumbnail, v.views, v.likes, v.duration,
                           c.name as category_name, c.color as category_color
                    FROM videos v
                    LEFT JOIN categories c ON v.category_id = c.id
                    WHERE v.status = 'published' AND v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    ORDER BY v.views DESC, v.likes DESC
                    LIMIT 10
                `);
                popularVideos = popularResult;
            } catch (error) {
                console.warn('Could not fetch popular videos:', error.message);
                popularVideos = [];
            }

            // Recent uploads - dengan fallback
            let recentVideos = [];
            try {
                const [recentResult] = await db.execute(`
                    SELECT v.id, v.title, v.thumbnail, v.status, v.created_at,
                           c.name as category_name
                    FROM videos v
                    LEFT JOIN categories c ON v.category_id = c.id
                    ORDER BY v.created_at DESC
                    LIMIT 5
                `);
                recentVideos = recentResult;
            } catch (error) {
                console.warn('Could not fetch recent videos:', error.message);
                recentVideos = [];
            }

            // Views trend (last 30 days) - dengan fallback
            let viewsTrend = [];
            try {
                const [trendsResult] = await db.execute(`
                    SELECT DATE(created_at) as date, 
                           COUNT(*) as uploads,
                           COALESCE(SUM(views), 0) as views
                    FROM videos 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                `);
                viewsTrend = trendsResult;
            } catch (error) {
                console.warn('Could not fetch views trend:', error.message);
                viewsTrend = [];
            }

            // Category statistics - dengan fallback
            let categoryStats = [];
            try {
                const [categoryResult] = await db.execute(`
                    SELECT c.name, c.color, 
                           COUNT(v.id) as video_count,
                           COALESCE(SUM(v.views), 0) as total_views
                    FROM categories c
                    LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                    WHERE c.is_active = 1
                    GROUP BY c.id, c.name, c.color
                    ORDER BY total_views DESC
                `);
                categoryStats = categoryResult;
            } catch (error) {
                console.warn('Could not fetch category stats:', error.message);
                categoryStats = [];
            }

            return {
                totalStats: totalStats[0] || {
                    total_videos: 0,
                    total_categories: 0,
                    total_series: 0,
                    total_views: 0,
                    total_likes: 0,
                    today_uploads: 0
                },
                popularVideos,
                recentVideos,
                viewsTrend,
                categoryStats
            };
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            
            // Return safe defaults
            return {
                totalStats: {
                    total_videos: 0,
                    total_categories: 0,
                    total_series: 0,
                    total_views: 0,
                    total_likes: 0,
                    today_uploads: 0
                },
                popularVideos: [],
                recentVideos: [],
                viewsTrend: [],
                categoryStats: []
            };
        }
    }

    static async getTopVideos(period = 'week', limit = 10) {
        try {
            // Pastikan tabel videos ada
            await this.ensureTablesExist();

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

            // Ensure limit is a valid number
            const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

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
            `, [validLimit]);

            return rows || [];
        } catch (error) {
            console.error('Error in getTopVideos:', error);
            return [];
        }
    }

    static async getCategoryPerformance() {
        try {
            await this.ensureTablesExist();

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

            return rows || [];
        } catch (error) {
            console.error('Error in getCategoryPerformance:', error);
            return [];
        }
    }

    static async getUploadTrends(days = 30) {
        try {
            await this.ensureTablesExist();

            const validDays = Math.max(1, Math.min(365, parseInt(days) || 30));

            const [rows] = await db.execute(`
                SELECT DATE(created_at) as date,
                       COUNT(*) as uploads,
                       SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
                       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts
                FROM videos 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [validDays]);

            return rows || [];
        } catch (error) {
            console.error('Error in getUploadTrends:', error);
            return [];
        }
    }

    // Helper method to ensure required tables exist
    static async ensureTablesExist() {
        try {
            // Check if videos table exists
            const [videosTables] = await db.execute("SHOW TABLES LIKE 'videos'");
            if (videosTables.length === 0) {
                console.log('📝 Creating videos table...');
                await this.createVideosTable();
            }

            // Check if categories table exists
            const [categoriesTables] = await db.execute("SHOW TABLES LIKE 'categories'");
            if (categoriesTables.length === 0) {
                console.log('📝 Creating categories table...');
                await this.createCategoriesTable();
            }

            // Check if series table exists
            const [seriesTables] = await db.execute("SHOW TABLES LIKE 'series'");
            if (seriesTables.length === 0) {
                console.log('📝 Creating series table...');
                await this.createSeriesTable();
            }

        } catch (error) {
            console.error('Error ensuring tables exist:', error);
        }
    }

    static async createVideosTable() {
        try {
            await db.execute(`
                CREATE TABLE videos (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    filename VARCHAR(255),
                    file_path TEXT,
                    file_url TEXT,
                    file_key VARCHAR(255),
                    thumbnail TEXT,
                    duration INT DEFAULT 0,
                    views INT DEFAULT 0,
                    likes INT DEFAULT 0,
                    tags TEXT,
                    category_id INT NULL,
                    series_id INT NULL,
                    episode_number INT NULL,
                    file_size BIGINT NULL,
                    video_width INT NULL,
                    video_height INT NULL,
                    fps DECIMAL(5,2) NULL,
                    bitrate INT NULL,
                    codec VARCHAR(50) NULL,
                    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_status (status),
                    INDEX idx_category (category_id),
                    INDEX idx_series (series_id),
                    INDEX idx_created (created_at),
                    INDEX idx_views (views),
                    INDEX idx_likes (likes)
                )
            `);
            console.log('✅ Videos table created successfully');
        } catch (error) {
            console.error('Error creating videos table:', error);
        }
    }

    static async createCategoriesTable() {
        try {
            await db.execute(`
                CREATE TABLE categories (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    image TEXT,
                    color VARCHAR(7) DEFAULT '#6366f1',
                    is_active BOOLEAN DEFAULT TRUE,
                    sort_order INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_slug (slug),
                    INDEX idx_active (is_active),
                    INDEX idx_sort (sort_order)
                )
            `);
            console.log('✅ Categories table created successfully');
        } catch (error) {
            console.error('Error creating categories table:', error);
        }
    }

    static async createSeriesTable() {
        try {
            await db.execute(`
                CREATE TABLE series (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    slug VARCHAR(255) UNIQUE NOT NULL,
                    thumbnail TEXT,
                    category_id INT NULL,
                    total_videos INT DEFAULT 0,
                    total_duration INT DEFAULT 0,
                    total_views INT DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_slug (slug),
                    INDEX idx_category (category_id),
                    INDEX idx_active (is_active)
                )
            `);
            console.log('✅ Series table created successfully');
        } catch (error) {
            console.error('Error creating series table:', error);
        }
    }
}

// ===== VIDEO MANAGEMENT MODEL FIXES =====
class VideoManagementModel {
    static async getVideosByStatus(status, limit = 10) {
        try {
            await AnalyticsModel.ensureTablesExist();
            
            const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));

            const [rows] = await db.execute(`
                SELECT v.*, c.name as category_name, s.title as series_title
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                WHERE v.status = ?
                ORDER BY v.created_at DESC
                LIMIT ?
            `, [status, validLimit]);

            return rows || [];
        } catch (error) {
            console.error('Error in getVideosByStatus:', error);
            return [];
        }
    }

    static async getVideoById(id) {
        try {
            await AnalyticsModel.ensureTablesExist();
            
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                return null;
            }

            const [rows] = await db.execute(`
                SELECT v.*, c.name as category_name, s.title as series_title
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                WHERE v.id = ?
            `, [videoId]);

            return rows[0] || null;
        } catch (error) {
            console.error('Error in getVideoById:', error);
            return null;
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