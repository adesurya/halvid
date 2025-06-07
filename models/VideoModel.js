const db = require('../config/database');

class VideoModel {
    // ===== BASIC VIDEO OPERATIONS =====
    
    // Mendapatkan semua video dengan pagination
    static async getAllVideos(limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `SELECT * FROM videos ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getAllVideos:', error);
            throw error;
        }
    }

    // Mendapatkan video berdasarkan ID
    static async getVideoById(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            const [rows] = await db.execute(
                'SELECT * FROM videos WHERE id = ?',
                [videoId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getVideoById:', error);
            throw error;
        }
    }

    // Menambah video baru
    static async createVideo(videoData) {
        try {
            const { 
                title, 
                description, 
                filename, 
                file_path, 
                thumbnail, 
                duration, 
                tags,
                file_size = null,
                video_width = null,
                video_height = null,
                fps = null,
                bitrate = null,
                codec = null
            } = videoData;

            const [result] = await db.execute(
                `INSERT INTO videos (
                    title, description, filename, file_path, thumbnail, duration, tags,
                    file_size, video_width, video_height, fps, bitrate, codec
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    title, description, filename, file_path, thumbnail, duration, tags,
                    file_size, video_width, video_height, fps, bitrate, codec
                ]
            );
            
            // Update tag relationships if tags exist
            if (tags && result.insertId) {
                await this.updateVideoTags(result.insertId, tags);
            }
            
            return result.insertId;
        } catch (error) {
            console.error('Error in createVideo:', error);
            throw error;
        }
    }

    // Update video
    static async updateVideo(id, videoData) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }

            const { title, description, tags, thumbnail } = videoData;
            
            const [result] = await db.execute(
                `UPDATE videos SET 
                    title = ?, description = ?, tags = ?, thumbnail = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [title, description, tags, thumbnail, videoId]
            );
            
            // Update tag relationships if tags exist
            if (tags) {
                await this.updateVideoTags(videoId, tags);
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in updateVideo:', error);
            throw error;
        }
    }

    // Hapus video
    static async deleteVideo(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            const [result] = await db.execute(
                'DELETE FROM videos WHERE id = ?',
                [videoId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in deleteVideo:', error);
            throw error;
        }
    }

    // ===== TIKTOK-STYLE FEATURES =====

    // Mendapatkan video random untuk feed TikTok-style
    static async getRandomVideos(limit = 10) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            
            // Menggunakan weighted random berdasarkan engagement score
            const sql = `
                SELECT *, 
                       (views + likes * 10) as engagement_score,
                       RAND() * (1 + LOG10(views + 1)) as weighted_random
                FROM videos 
                ORDER BY weighted_random DESC 
                LIMIT ${limitInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getRandomVideos:', error);
            throw error;
        }
    }

    // Mendapatkan video berdasarkan views tertinggi
    static async getVideosByViews(limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `
                SELECT * FROM videos 
                ORDER BY views DESC, likes DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getVideosByViews:', error);
            throw error;
        }
    }

    // Mendapatkan video berdasarkan likes tertinggi
    static async getVideosByLikes(limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `
                SELECT * FROM videos 
                ORDER BY likes DESC, views DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getVideosByLikes:', error);
            throw error;
        }
    }

    // Mendapatkan video trending (berdasarkan engagement score)
    static async getTrendingVideos(limit = 5) {
        try {
            const limitInt = Math.max(1, Math.min(50, parseInt(limit) || 5));
            
            const sql = `
                SELECT *, 
                       (views + likes * 10) as engagement_score,
                       DATEDIFF(NOW(), created_at) as age_days
                FROM videos 
                ORDER BY (views + likes * 10) / (DATEDIFF(NOW(), created_at) + 1) DESC
                LIMIT ${limitInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getTrendingVideos:', error);
            throw error;
        }
    }

    // Mendapatkan video populer berdasarkan engagement (views + likes)
    static async getPopularVideos(limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `
                SELECT *, (views + likes * 10) as engagement_score 
                FROM videos 
                ORDER BY engagement_score DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getPopularVideos:', error);
            throw error;
        }
    }

    // Mendapatkan video terbaru
    static async getLatestVideos(limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `
                SELECT * FROM videos 
                ORDER BY created_at DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error in getLatestVideos:', error);
            throw error;
        }
    }

    // ===== SEARCH FUNCTIONALITY =====

    // Mencari video berdasarkan judul, description, atau tags
    static async searchVideos(query, limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const searchQuery = `%${query}%`;
            const sql = `
                SELECT *, 
                       (views + likes * 10) as engagement_score,
                       CASE 
                           WHEN title LIKE ? THEN 3
                           WHEN description LIKE ? THEN 2  
                           WHEN tags LIKE ? THEN 1
                           ELSE 0
                       END as relevance_score
                FROM videos 
                WHERE title LIKE ? OR tags LIKE ? OR description LIKE ? 
                ORDER BY relevance_score DESC, engagement_score DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql, [
                searchQuery, searchQuery, searchQuery,
                searchQuery, searchQuery, searchQuery
            ]);
            return rows;
        } catch (error) {
            console.error('Error in searchVideos:', error);
            throw error;
        }
    }

    // Mendapatkan saran pencarian
    static async getSearchSuggestions(query, limit = 5) {
        try {
            const limitInt = Math.max(1, Math.min(20, parseInt(limit) || 5));
            const searchQuery = `%${query}%`;
            
            // Get suggestions from titles
            const [titleSuggestions] = await db.execute(
                `SELECT DISTINCT title as suggestion, 'title' as type, views as count 
                 FROM videos 
                 WHERE title LIKE ? 
                 ORDER BY views DESC 
                 LIMIT ${Math.floor(limitInt/2)}`,
                [searchQuery]
            );

            // Get suggestions from tags
            const [tagRows] = await db.execute(
                `SELECT tags FROM videos WHERE tags LIKE ? AND tags IS NOT NULL`,
                [searchQuery]
            );

            // Process tag suggestions
            const tagCounts = {};
            
            tagRows.forEach(row => {
                if (row.tags) {
                    const tags = row.tags.split(',');
                    tags.forEach(tag => {
                        const cleanTag = tag.trim().toLowerCase();
                        if (cleanTag.includes(query.toLowerCase()) && cleanTag.length > 0) {
                            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                        }
                    });
                }
            });

            // Convert tag counts to suggestions array
            const tagSuggestions = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, Math.ceil(limitInt/2))
                .map(([tag, count]) => ({
                    suggestion: tag,
                    type: 'tag',
                    count: count
                }));

            // Combine and limit results
            const allSuggestions = [...titleSuggestions, ...tagSuggestions]
                .slice(0, limitInt);

            return allSuggestions;
        } catch (error) {
            console.error('Error in getSearchSuggestions:', error);
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
            console.error('Error in getSearchCount:', error);
            throw error;
        }
    }

    // ===== VIDEO INTERACTIONS =====

    // Update views count
    static async incrementViews(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            await db.execute(
                'UPDATE videos SET views = views + 1 WHERE id = ?',
                [videoId]
            );
            
            // Log interaction
            await this.logInteraction(videoId, 'view');
        } catch (error) {
            console.error('Error in incrementViews:', error);
            throw error;
        }
    }

    // Update likes count (increment)
    static async incrementLikes(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            await db.execute(
                'UPDATE videos SET likes = likes + 1 WHERE id = ?',
                [videoId]
            );
            
            // Log interaction
            await this.logInteraction(videoId, 'like');
        } catch (error) {
            console.error('Error in incrementLikes:', error);
            throw error;
        }
    }

    // Update likes count (decrement)
    static async decrementLikes(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            await db.execute(
                'UPDATE videos SET likes = GREATEST(0, likes - 1) WHERE id = ?',
                [videoId]
            );
            
            // Log interaction
            await this.logInteraction(videoId, 'unlike');
        } catch (error) {
            console.error('Error in decrementLikes:', error);
            throw error;
        }
    }

    // Log user interaction
    static async logInteraction(videoId, type, userIp = null, userAgent = null) {
        try {
            await db.execute(
                `INSERT INTO video_interactions (video_id, user_ip, user_agent, interaction_type) 
                 VALUES (?, ?, ?, ?)`,
                [videoId, userIp, userAgent, type]
            );
        } catch (error) {
            console.error('Error in logInteraction:', error);
            // Don't throw error for logging failures
        }
    }

    // ===== TAG MANAGEMENT =====

    // Mendapatkan video berdasarkan tag
    static async getVideosByTag(tag, limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const tagQuery = `%${tag}%`;
            const sql = `
                SELECT * FROM videos 
                WHERE tags LIKE ? 
                ORDER BY views DESC, likes DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql, [tagQuery]);
            return rows;
        } catch (error) {
            console.error('Error in getVideosByTag:', error);
            throw error;
        }
    }

    // Mendapatkan video terkait berdasarkan tags yang sama
    static async getRelatedVideos(videoId, tags, limit = 4) {
        try {
            const limitInt = Math.max(1, Math.min(20, parseInt(limit) || 4));
            
            if (!tags || tags.trim() === '') {
                // Jika tidak ada tags, ambil video random kecuali video saat ini
                const sql = `
                    SELECT * FROM videos 
                    WHERE id != ? 
                    ORDER BY RAND() 
                    LIMIT ${limitInt}
                `;
                const [rows] = await db.execute(sql, [videoId]);
                return rows;
            }

            // Split tags dan buat query untuk mencari video dengan tag serupa
            const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            
            if (tagArray.length === 0) {
                const sql = `
                    SELECT * FROM videos 
                    WHERE id != ? 
                    ORDER BY RAND() 
                    LIMIT ${limitInt}
                `;
                const [rows] = await db.execute(sql, [videoId]);
                return rows;
            }
            
            const tagConditions = tagArray.map(() => 'tags LIKE ?').join(' OR ');
            const tagParams = tagArray.map(tag => `%${tag}%`);
            
            const sql = `
                SELECT *, 
                       (views + likes * 10) as engagement_score
                FROM videos 
                WHERE id != ? AND (${tagConditions}) 
                ORDER BY engagement_score DESC 
                LIMIT ${limitInt}
            `;
            const [rows] = await db.execute(sql, [videoId, ...tagParams]);
            return rows;
        } catch (error) {
            console.error('Error in getRelatedVideos:', error);
            throw error;
        }
    }

    // Mendapatkan tags populer
    static async getPopularTags(limit = 10) {
        try {
            const limitInt = Math.max(1, Math.min(50, parseInt(limit) || 10));
            
            const [rows] = await db.execute(
                'SELECT tags FROM videos WHERE tags IS NOT NULL AND tags != ""'
            );
            
            // Process tags
            const tagCounts = {};
            
            rows.forEach(row => {
                if (row.tags) {
                    const tags = row.tags.split(',');
                    tags.forEach(tag => {
                        const cleanTag = tag.trim().toLowerCase();
                        if (cleanTag && cleanTag.length > 0) {
                            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                        }
                    });
                }
            });

            // Sort and return top tags
            return Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limitInt)
                .map(([tag, count]) => ({ tag, count }));
        } catch (error) {
            console.error('Error in getPopularTags:', error);
            throw error;
        }
    }

    // Update video tags relationship
    static async updateVideoTags(videoId, tagsString) {
        try {
            if (!tagsString || tagsString.trim() === '') return;
            
            const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            
            // Delete existing relationships
            await db.execute('DELETE FROM video_tags WHERE video_id = ?', [videoId]);
            
            // Insert new tags and relationships
            for (const tagName of tags) {
                // Insert or update tag
                await db.execute(
                    `INSERT INTO tags (name, usage_count) 
                     VALUES (?, 1) 
                     ON DUPLICATE KEY UPDATE usage_count = usage_count + 1`,
                    [tagName.toLowerCase()]
                );
                
                // Get tag ID
                const [tagRows] = await db.execute(
                    'SELECT id FROM tags WHERE name = ?',
                    [tagName.toLowerCase()]
                );
                
                if (tagRows.length > 0) {
                    // Insert video-tag relationship
                    await db.execute(
                        'INSERT IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)',
                        [videoId, tagRows[0].id]
                    );
                }
            }
        } catch (error) {
            console.error('Error in updateVideoTags:', error);
            // Don't throw error for tag update failures
        }
    }

    // ===== STATISTICS & ANALYTICS =====

    // Mendapatkan total count untuk pagination
    static async getTotalCount() {
        try {
            const [rows] = await db.execute('SELECT COUNT(*) as total FROM videos');
            return rows[0].total;
        } catch (error) {
            console.error('Error in getTotalCount:', error);
            throw error;
        }
    }

    // Mendapatkan statistik video
    static async getVideoStats(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            const [rows] = await db.execute(
                'SELECT views, likes, created_at, duration FROM videos WHERE id = ?',
                [videoId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getVideoStats:', error);
            throw error;
        }
    }

    // Mendapatkan statistik umum
    static async getGeneralStats() {
        try {
            const [totalVideos] = await db.execute('SELECT COUNT(*) as count FROM videos');
            const [totalViews] = await db.execute('SELECT SUM(views) as total FROM videos');
            const [totalLikes] = await db.execute('SELECT SUM(likes) as total FROM videos');
            const [avgDuration] = await db.execute('SELECT AVG(duration) as avg FROM videos');

            return {
                totalVideos: totalVideos[0].count,
                totalViews: totalViews[0].total || 0,
                totalLikes: totalLikes[0].total || 0,
                averageDuration: Math.round(avgDuration[0].avg || 0)
            };
        } catch (error) {
            console.error('Error in getGeneralStats:', error);
            throw error;
        }
    }

    // ===== ADVANCED QUERIES =====

    // Mendapatkan video berdasarkan durasi
    static async getVideosByDuration(minDuration, maxDuration, limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            const sql = `
                SELECT * FROM videos 
                WHERE duration BETWEEN ? AND ? 
                ORDER BY views DESC, likes DESC 
                LIMIT ${limitInt} OFFSET ${offsetInt}
            `;
            const [rows] = await db.execute(sql, [minDuration, maxDuration]);
            return rows;
        } catch (error) {
            console.error('Error in getVideosByDuration:', error);
            throw error;
        }
    }

    // Pencarian video lanjutan dengan filter
    static async advancedSearch(filters, limit = 10, offset = 0) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            const offsetInt = Math.max(0, parseInt(offset) || 0);
            
            let whereConditions = [];
            let params = [];

            // Query filter
            if (filters.query) {
                whereConditions.push('(title LIKE ? OR description LIKE ? OR tags LIKE ?)');
                const queryParam = `%${filters.query}%`;
                params.push(queryParam, queryParam, queryParam);
            }

            // Duration filter
            if (filters.minDuration) {
                whereConditions.push('duration >= ?');
                params.push(filters.minDuration);
            }
            if (filters.maxDuration) {
                whereConditions.push('duration <= ?');
                params.push(filters.maxDuration);
            }

            // Views filter
            if (filters.minViews) {
                whereConditions.push('views >= ?');
                params.push(filters.minViews);
            }

            // Date filter
            if (filters.startDate) {
                whereConditions.push('created_at >= ?');
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                whereConditions.push('created_at <= ?');
                params.push(filters.endDate);
            }

            // Build SQL query
            let sql = 'SELECT * FROM videos';
            if (whereConditions.length > 0) {
                sql += ' WHERE ' + whereConditions.join(' AND ');
            }

            // Sorting
            const sortBy = filters.sortBy || 'created_at';
            const sortOrder = filters.sortOrder || 'DESC';
            sql += ` ORDER BY ${sortBy} ${sortOrder}`;
            
            sql += ` LIMIT ${limitInt} OFFSET ${offsetInt}`;

            const [rows] = await db.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Error in advancedSearch:', error);
            throw error;
        }
    }

    // Batch update views (untuk optimasi)
    static async batchUpdateViews(videoViews) {
        try {
            if (!Array.isArray(videoViews) || videoViews.length === 0) {
                return;
            }

            // Prepare batch update
            const updatePromises = videoViews.map(({ id, views }) => {
                return db.execute(
                    'UPDATE videos SET views = views + ? WHERE id = ?',
                    [views, id]
                );
            });

            await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error in batchUpdateViews:', error);
            throw error;
        }
    }

    // ===== RECOMMENDATION SYSTEM =====

    // Mendapatkan video rekomendasi berdasarkan user behavior
    static async getRecommendedVideos(userPreferences = {}, limit = 10) {
        try {
            const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10));
            
            let sql = `
                SELECT *, 
                       (views + likes * 10) as engagement_score,
                       RAND() * (1 + LOG10(views + 1)) as weighted_random
                FROM videos 
            `;
            
            let whereConditions = [];
            let params = [];
            
            // Filter by preferred duration if available
            if (userPreferences.minDuration && userPreferences.maxDuration) {
                whereConditions.push('duration BETWEEN ? AND ?');
                params.push(userPreferences.minDuration, userPreferences.maxDuration);
            }
            
            // Filter by preferred tags if available
            if (userPreferences.preferredTags && userPreferences.preferredTags.length > 0) {
                const tagConditions = userPreferences.preferredTags.map(() => 'tags LIKE ?').join(' OR ');
                whereConditions.push(`(${tagConditions})`);
                params.push(...userPreferences.preferredTags.map(tag => `%${tag}%`));
            }
            
            if (whereConditions.length > 0) {
                sql += ' WHERE ' + whereConditions.join(' AND ');
            }
            
            sql += ` ORDER BY weighted_random DESC LIMIT ${limitInt}`;
            
            const [rows] = await db.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Error in getRecommendedVideos:', error);
            throw error;
        }
    }

    // ===== UTILITY FUNCTIONS =====

    // Validasi video data
    static validateVideoData(videoData) {
        const errors = [];
        
        if (!videoData.title || videoData.title.trim().length === 0) {
            errors.push('Title is required');
        }
        
        if (!videoData.file_path || videoData.file_path.trim().length === 0) {
            errors.push('File path is required');
        }
        
        if (!videoData.duration || videoData.duration < 1) {
            errors.push('Duration must be greater than 0');
        }
        
        if (videoData.title && videoData.title.length > 255) {
            errors.push('Title must be less than 255 characters');
        }
        
        return errors;
    }

    // Clean up old data (untuk maintenance)
    static async cleanupOldData(retentionDays = 90) {
        try {
            // Clean up old interactions
            await db.execute(
                'DELETE FROM video_interactions WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [retentionDays]
            );
            
            // Clean up old search queries
            await db.execute(
                'DELETE FROM search_queries WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [retentionDays]
            );
            
            // Update tag usage counts
            await db.execute(`
                UPDATE tags t SET usage_count = (
                    SELECT COUNT(*) FROM video_tags vt WHERE vt.tag_id = t.id
                )
            `);
            
            // Remove unused tags
            await db.execute('DELETE FROM tags WHERE usage_count = 0');
            
        } catch (error) {
            console.error('Error in cleanupOldData:', error);
            throw error;
        }
    }

    // Check if video exists
    static async videoExists(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                return false;
            }
            
            const [rows] = await db.execute(
                'SELECT COUNT(*) as count FROM videos WHERE id = ?',
                [videoId]
            );
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error in videoExists:', error);
            return false;
        }
    }

    // Get video file info
    static async getVideoFileInfo(id) {
        try {
            const videoId = parseInt(id);
            if (!videoId || videoId < 1) {
                throw new Error('Invalid video ID');
            }
            
            const [rows] = await db.execute(
                `SELECT filename, file_path, file_size, video_width, video_height, 
                        fps, bitrate, codec, duration 
                 FROM videos WHERE id = ?`,
                [videoId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error in getVideoFileInfo:', error);
            throw error;
        }
    }
}

module.exports = VideoModel;