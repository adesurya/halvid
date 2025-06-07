// setup-database.js - Complete database setup script
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

class DatabaseSetup {
    constructor() {
        this.connection = null;
        this.dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'short_video_db',
            charset: 'utf8mb4'
        };
    }

    async connect() {
        try {
            console.log('🔄 Connecting to database...');
            this.connection = await mysql.createConnection(this.dbConfig);
            console.log('✅ Connected to database successfully');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async createDatabase() {
        try {
            console.log('🔄 Creating database if not exists...');
            
            // Connect without database first
            const tempConnection = await mysql.createConnection({
                host: this.dbConfig.host,
                user: this.dbConfig.user,
                password: this.dbConfig.password
            });

            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await tempConnection.end();
            
            console.log(`✅ Database '${this.dbConfig.database}' ready`);
            return true;
        } catch (error) {
            console.error('❌ Error creating database:', error.message);
            return false;
        }
    }

    async createTables() {
        try {
            console.log('🔄 Creating tables...');

            // Create admin_users table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100),
                    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'admin',
                    avatar TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_username (username),
                    INDEX idx_email (email),
                    INDEX idx_role (role),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB
            `);
            console.log('✅ admin_users table created');

            // Create admin_sessions table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS admin_sessions (
                    id VARCHAR(255) PRIMARY KEY,
                    admin_id INT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
                    INDEX idx_admin_id (admin_id),
                    INDEX idx_expires (expires_at)
                ) ENGINE=InnoDB
            `);
            console.log('✅ admin_sessions table created');

            // Create categories table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS categories (
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
                ) ENGINE=InnoDB
            `);
            console.log('✅ categories table created');

            // Create series table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS series (
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
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    INDEX idx_slug (slug),
                    INDEX idx_category (category_id),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB
            `);
            console.log('✅ series table created');

            // Create videos table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS videos (
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
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
                    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
                    INDEX idx_status (status),
                    INDEX idx_category (category_id),
                    INDEX idx_series (series_id),
                    INDEX idx_created (created_at),
                    INDEX idx_views (views),
                    INDEX idx_likes (likes),
                    FULLTEXT idx_search (title, description, tags)
                ) ENGINE=InnoDB
            `);
            console.log('✅ videos table created');

            // Create tags table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS tags (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    usage_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_name (name),
                    INDEX idx_usage (usage_count)
                ) ENGINE=InnoDB
            `);
            console.log('✅ tags table created');

            // Create video_tags table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS video_tags (
                    video_id INT,
                    tag_id INT,
                    PRIMARY KEY (video_id, tag_id),
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                ) ENGINE=InnoDB
            `);
            console.log('✅ video_tags table created');

            // Create video_interactions table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS video_interactions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    video_id INT NOT NULL,
                    user_ip VARCHAR(45),
                    user_agent TEXT,
                    interaction_type ENUM('view', 'like', 'unlike', 'share') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                    INDEX idx_video (video_id),
                    INDEX idx_type (interaction_type),
                    INDEX idx_created (created_at)
                ) ENGINE=InnoDB
            `);
            console.log('✅ video_interactions table created');

            // Create video_stats table for daily analytics
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS video_stats (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    video_id INT NOT NULL,
                    date DATE NOT NULL,
                    views INT DEFAULT 0,
                    likes INT DEFAULT 0,
                    shares INT DEFAULT 0,
                    watch_time INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_video_date (video_id, date),
                    INDEX idx_date (date),
                    INDEX idx_video (video_id)
                ) ENGINE=InnoDB
            `);
            console.log('✅ video_stats table created');

            console.log('🎉 All tables created successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error creating tables:', error);
            return false;
        }
    }

    async createDefaultData() {
        try {
            console.log('🔄 Creating default data...');

            // Create default admin user
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await this.connection.execute(`
                INSERT IGNORE INTO admin_users (
                    username, email, password, full_name, role, is_active
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                'admin@shortvideo.com',
                hashedPassword,
                'Super Administrator',
                'super_admin',
                true
            ]);

            // Create default categories
            const defaultCategories = [
                { name: 'Entertainment', slug: 'entertainment', color: '#ff6b6b', description: 'Video hiburan dan komedi' },
                { name: 'Education', slug: 'education', color: '#4ecdc4', description: 'Video edukasi dan tutorial' },
                { name: 'Music', slug: 'music', color: '#45b7d1', description: 'Video musik dan performance' },
                { name: 'Sports', slug: 'sports', color: '#96ceb4', description: 'Video olahraga dan aktivitas fisik' },
                { name: 'Technology', slug: 'technology', color: '#ffeaa7', description: 'Video teknologi dan gadget' },
                { name: 'Lifestyle', slug: 'lifestyle', color: '#fd79a8', description: 'Video gaya hidup dan tips' }
            ];

            for (const category of defaultCategories) {
                await this.connection.execute(`
                    INSERT IGNORE INTO categories (name, slug, color, description, is_active, sort_order)
                    VALUES (?, ?, ?, ?, TRUE, 0)
                `, [category.name, category.slug, category.color, category.description]);
            }

            // Create sample tags
            const defaultTags = [
                'funny', 'tutorial', 'music', 'dance', 'cooking', 'tech', 'review',
                'gaming', 'travel', 'fitness', 'fashion', 'art', 'comedy', 'viral'
            ];

            for (const tagName of defaultTags) {
                await this.connection.execute(`
                    INSERT IGNORE INTO tags (name, usage_count) VALUES (?, 0)
                `, [tagName]);
            }

            console.log('✅ Default data created');
            return true;
        } catch (error) {
            console.error('❌ Error creating default data:', error);
            return false;
        }
    }

    async createSampleVideos() {
        try {
            console.log('🔄 Creating sample videos...');

            // Get category IDs
            const [categories] = await this.connection.execute('SELECT id, name FROM categories LIMIT 6');
            
            if (categories.length === 0) {
                console.log('⚠️  No categories found, skipping sample videos');
                return true;
            }

            const sampleVideos = [
                {
                    title: 'Welcome to ShortVideo Platform',
                    description: 'Selamat datang di platform video pendek terbaik! Video ini menjelaskan fitur-fitur utama yang tersedia.',
                    filename: 'welcome-video.mp4',
                    file_path: '/uploads/sample/welcome-video.mp4',
                    file_url: '/uploads/sample/welcome-video.mp4',
                    thumbnail: '/uploads/sample/welcome-thumbnail.jpg',
                    duration: 120,
                    views: 1520,
                    likes: 89,
                    tags: 'welcome,tutorial,platform',
                    status: 'published'
                },
                {
                    title: 'Cara Upload Video dengan Mudah',
                    description: 'Tutorial lengkap cara mengupload video ke platform ShortVideo dengan berbagai format yang didukung.',
                    filename: 'upload-tutorial.mp4',
                    file_path: '/uploads/sample/upload-tutorial.mp4',
                    file_url: '/uploads/sample/upload-tutorial.mp4',
                    thumbnail: '/uploads/sample/upload-thumbnail.jpg',
                    duration: 180,
                    views: 892,
                    likes: 45,
                    tags: 'tutorial,upload,guide',
                    status: 'published'
                },
                {
                    title: 'Tips Membuat Video Viral',
                    description: 'Rahasia membuat konten video yang menarik dan berpotensi viral di platform media sosial.',
                    filename: 'viral-tips.mp4',
                    file_path: '/uploads/sample/viral-tips.mp4',
                    file_url: '/uploads/sample/viral-tips.mp4',
                    thumbnail: '/uploads/sample/viral-thumbnail.jpg',
                    duration: 240,
                    views: 2340,
                    likes: 156,
                    tags: 'tips,viral,content',
                    status: 'published'
                }
            ];

            for (let i = 0; i < sampleVideos.length; i++) {
                const video = sampleVideos[i];
                const category = categories[i % categories.length];
                
                await this.connection.execute(`
                    INSERT IGNORE INTO videos (
                        title, description, filename, file_path, file_url, thumbnail,
                        duration, views, likes, tags, category_id, status,
                        video_width, video_height, fps, bitrate, codec
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1920, 1080, 30.0, 2500, 'h264')
                `, [
                    video.title, video.description, video.filename, video.file_path,
                    video.file_url, video.thumbnail, video.duration, video.views,
                    video.likes, video.tags, category.id, video.status
                ]);
            }

            console.log('✅ Sample videos created');
            return true;
        } catch (error) {
            console.error('❌ Error creating sample videos:', error);
            return false;
        }
    }

    async verifySetup() {
        try {
            console.log('🔄 Verifying database setup...');

            // Check tables
            const [tables] = await this.connection.execute('SHOW TABLES');
            console.log(`✅ Found ${tables.length} tables:`, tables.map(t => Object.values(t)[0]).join(', '));

            // Check admin user
            const [adminUsers] = await this.connection.execute('SELECT username, email, role FROM admin_users');
            console.log(`✅ Found ${adminUsers.length} admin users`);

            // Check categories
            const [categoriesCount] = await this.connection.execute('SELECT COUNT(*) as count FROM categories');
            console.log(`✅ Found ${categoriesCount[0].count} categories`);

            // Check videos
            const [videosCount] = await this.connection.execute('SELECT COUNT(*) as count FROM videos');
            console.log(`✅ Found ${videosCount[0].count} videos`);

            return true;
        } catch (error) {
            console.error('❌ Error verifying setup:', error);
            return false;
        }
    }

    async testLogin() {
        try {
            console.log('🔄 Testing admin login...');

            const [admin] = await this.connection.execute(
                'SELECT id, username, password, role FROM admin_users WHERE username = ?',
                ['admin']
            );

            if (admin.length === 0) {
                console.log('❌ Admin user not found');
                return false;
            }

            const isValidPassword = await bcrypt.compare('admin123', admin[0].password);
            console.log('🔐 Password test:', isValidPassword ? '✅ Valid' : '❌ Invalid');

            return isValidPassword;
        } catch (error) {
            console.error('❌ Error testing login:', error);
            return false;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Database connection closed');
        }
    }

    async run() {
        try {
            console.log('🎬 ShortVideo Database Setup');
            console.log('============================\n');

            // Create database
            if (!(await this.createDatabase())) {
                throw new Error('Failed to create database');
            }

            // Connect to database
            if (!(await this.connect())) {
                throw new Error('Failed to connect to database');
            }

            // Create tables
            if (!(await this.createTables())) {
                throw new Error('Failed to create tables');
            }

            // Create default data
            if (!(await this.createDefaultData())) {
                throw new Error('Failed to create default data');
            }

            // Create sample videos
            if (!(await this.createSampleVideos())) {
                console.log('⚠️  Failed to create sample videos (this is optional)');
            }

            // Verify setup
            if (!(await this.verifySetup())) {
                throw new Error('Setup verification failed');
            }

            // Test login
            if (!(await this.testLogin())) {
                throw new Error('Admin login test failed');
            }

            console.log('\n🎉 Database setup completed successfully!');
            console.log('📋 Admin login credentials:');
            console.log('   URL: http://localhost:3000/admin/login');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('\n⚠️  Remember to change the default password after first login!');
            console.log('💡 You can now start your application with: npm start');

        } catch (error) {
            console.error('\n❌ Database setup failed:', error.message);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// Helper function to check environment
function checkEnvironment() {
    const required = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.log('\n💡 Please create a .env file with:');
        console.log('   DB_HOST=localhost');
        console.log('   DB_USER=root');
        console.log('   DB_PASSWORD=your_password');
        console.log('   DB_NAME=short_video_db');
        return false;
    }
    
    return true;
}

// Main execution
async function main() {
    if (!checkEnvironment()) {
        process.exit(1);
    }

    const setup = new DatabaseSetup();
    await setup.run();
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DatabaseSetup;