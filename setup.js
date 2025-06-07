// setup.js - Automated setup script for ShortVideo application
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupEnvironment() {
    colorLog('\n🎬 ShortVideo Platform Setup Wizard', 'cyan');
    colorLog('=====================================', 'cyan');
    
    console.log('This wizard will help you set up your ShortVideo platform.');
    console.log('Please provide the following information:\n');

    const config = {};

    // Database Configuration
    colorLog('📊 Database Configuration', 'yellow');
    config.DB_HOST = await question('Database host (localhost): ') || 'localhost';
    config.DB_PORT = await question('Database port (3306): ') || '3306';
    config.DB_USER = await question('Database username (root): ') || 'root';
    config.DB_PASSWORD = await question('Database password: ');
    config.DB_NAME = await question('Database name (short_video_db): ') || 'short_video_db';

    // Wasabi Configuration
    colorLog('\n☁️ Wasabi Cloud Storage Configuration', 'yellow');
    console.log('You need a Wasabi account. Sign up at https://wasabi.com if you don\'t have one.');
    config.WASABI_ACCESS_KEY = await question('Wasabi Access Key: ');
    config.WASABI_SECRET_KEY = await question('Wasabi Secret Key: ');
    config.WASABI_BUCKET_NAME = await question('Wasabi Bucket Name: ');
    config.WASABI_REGION = await question('Wasabi Region (us-east-1): ') || 'us-east-1';

    // Admin Configuration
    colorLog('\n👨‍💼 Admin Account Configuration', 'yellow');
    config.ADMIN_USERNAME = await question('Admin username (admin): ') || 'admin';
    config.ADMIN_EMAIL = await question('Admin email: ');
    config.ADMIN_PASSWORD = await question('Admin password: ');

    // Server Configuration
    colorLog('\n🖥️ Server Configuration', 'yellow');
    config.PORT = await question('Server port (3000): ') || '3000';
    config.NODE_ENV = await question('Environment (development): ') || 'development';

    // Generate secrets
    colorLog('\n🔐 Generating security keys...', 'blue');
    config.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    config.JWT_SECRET = crypto.randomBytes(32).toString('hex');

    return config;
}

async function createEnvFile(config) {
    colorLog('\n📝 Creating .env file...', 'blue');

    const envContent = `# ShortVideo Platform Environment Variables
# Generated on ${new Date().toISOString()}

# ===== SERVER CONFIGURATION =====
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}
ALLOWED_ORIGINS=http://localhost:${config.PORT}

# ===== SESSION CONFIGURATION =====
SESSION_SECRET=${config.SESSION_SECRET}
JWT_SECRET=${config.JWT_SECRET}

# ===== DATABASE CONFIGURATION =====
DB_HOST=${config.DB_HOST}
DB_PORT=${config.DB_PORT}
DB_USER=${config.DB_USER}
DB_PASSWORD=${config.DB_PASSWORD}
DB_NAME=${config.DB_NAME}

# ===== WASABI CLOUD STORAGE CONFIGURATION =====
WASABI_ACCESS_KEY=${config.WASABI_ACCESS_KEY}
WASABI_SECRET_KEY=${config.WASABI_SECRET_KEY}
WASABI_BUCKET_NAME=${config.WASABI_BUCKET_NAME}
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=${config.WASABI_REGION}

# ===== ADMIN CONFIGURATION =====
DEFAULT_ADMIN_USERNAME=${config.ADMIN_USERNAME}
DEFAULT_ADMIN_EMAIL=${config.ADMIN_EMAIL}
DEFAULT_ADMIN_PASSWORD=${config.ADMIN_PASSWORD}

# ===== SECURITY CONFIGURATION =====
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_RATE_LIMIT_MAX=50

# ===== FFMPEG CONFIGURATION =====
VIDEO_THUMBNAIL_TIME=5s
VIDEO_THUMBNAIL_SIZE=320x240

# ===== ANALYTICS CONFIGURATION =====
ENABLE_ANALYTICS=true
ANALYTICS_RETENTION_DAYS=90

# ===== LOGGING CONFIGURATION =====
LOG_LEVEL=info
LOG_TO_FILE=true

# ===== PERFORMANCE CONFIGURATION =====
ENABLE_CACHE=true
ENABLE_COMPRESSION=true

# ===== FEATURE FLAGS =====
ENABLE_VIDEO_UPLOAD=true
ENABLE_SERIES=true
ENABLE_CATEGORIES=true
ENABLE_ANALYTICS=true
`;

    fs.writeFileSync('.env', envContent);
    colorLog('✅ .env file created successfully!', 'green');
}

async function createDatabase(config) {
    colorLog('\n🗄️ Setting up database...', 'blue');

    try {
        // Connect to MySQL without database to create it
        const connection = await mysql.createConnection({
            host: config.DB_HOST,
            port: config.DB_PORT,
            user: config.DB_USER,
            password: config.DB_PASSWORD
        });

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        colorLog(`✅ Database '${config.DB_NAME}' created/verified`, 'green');

        // Use the database
        await connection.execute(`USE \`${config.DB_NAME}\``);

        // Read and execute schema
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.execute(statement);
            }
        }

        colorLog('✅ Database schema created successfully!', 'green');

        // Create admin user
        const hashedPassword = await bcrypt.hash(config.ADMIN_PASSWORD, 10);
        
        await connection.execute(`
            INSERT INTO admin_users (username, email, password, full_name, role) 
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE password = VALUES(password)
        `, [
            config.ADMIN_USERNAME,
            config.ADMIN_EMAIL,
            hashedPassword,
            'Super Administrator',
            'super_admin'
        ]);

        colorLog('✅ Admin user created successfully!', 'green');

        await connection.end();

    } catch (error) {
        colorLog(`❌ Database setup failed: ${error.message}`, 'red');
        throw error;
    }
}

async function testWasabiConnection(config) {
    colorLog('\n☁️ Testing Wasabi connection...', 'blue');

    try {
        const AWS = require('aws-sdk');
        
        const s3 = new AWS.S3({
            accessKeyId: config.WASABI_ACCESS_KEY,
            secretAccessKey: config.WASABI_SECRET_KEY,
            endpoint: 'https://s3.wasabisys.com',
            region: config.WASABI_REGION,
            s3ForcePathStyle: true
        });

        // Test bucket access
        await s3.headBucket({ Bucket: config.WASABI_BUCKET_NAME }).promise();
        colorLog('✅ Wasabi connection successful!', 'green');

    } catch (error) {
        if (error.code === 'NotFound') {
            colorLog(`❌ Bucket '${config.WASABI_BUCKET_NAME}' not found. Please create it in your Wasabi console.`, 'red');
        } else if (error.code === 'Forbidden') {
            colorLog('❌ Access denied. Please check your Wasabi credentials.', 'red');
        } else {
            colorLog(`❌ Wasabi connection failed: ${error.message}`, 'red');
        }
        throw error;
    }
}

async function createDirectories() {
    colorLog('\n📁 Creating necessary directories...', 'blue');

    const directories = [
        'uploads',
        'uploads/videos',
        'uploads/thumbnails',
        'uploads/categories',
        'uploads/series',
        'logs',
        'backups'
    ];

    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            colorLog(`✅ Created directory: ${dir}`, 'green');
        }
    }
}

async function installDependencies() {
    colorLog('\n📦 Installing dependencies...', 'blue');
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['install'], { stdio: 'inherit' });
        
        npm.on('close', (code) => {
            if (code === 0) {
                colorLog('✅ Dependencies installed successfully!', 'green');
                resolve();
            } else {
                colorLog('❌ Failed to install dependencies', 'red');
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
        
        npm.on('error', (error) => {
            colorLog(`❌ Failed to start npm install: ${error.message}`, 'red');
            reject(error);
        });
    });
}

async function createSchemaFile() {
    const schemaContent = `-- ShortVideo Database Schema
-- Auto-generated by setup script

-- Create database (handled by setup script)
-- CREATE DATABASE IF NOT EXISTS short_video_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE short_video_db;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    image VARCHAR(255),
    color VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Series table
CREATE TABLE IF NOT EXISTS series (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) NOT NULL UNIQUE,
    thumbnail VARCHAR(255),
    category_id INT,
    total_videos INT DEFAULT 0,
    total_duration INT DEFAULT 0,
    total_views INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Update videos table (create if not exists, alter if exists)
CREATE TABLE IF NOT EXISTS videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500),
    file_key VARCHAR(255),
    thumbnail VARCHAR(255),
    duration INT DEFAULT 0,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    tags TEXT,
    category_id INT,
    series_id INT,
    episode_number INT,
    file_size BIGINT,
    video_width INT,
    video_height INT,
    fps DECIMAL(5,2),
    bitrate INT,
    codec VARCHAR(50),
    status ENUM('draft', 'processing', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'admin',
    avatar VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id VARCHAR(128) PRIMARY KEY,
    admin_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Video interactions table
CREATE TABLE IF NOT EXISTS video_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    interaction_type ENUM('view', 'like', 'unlike', 'share') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Video statistics table
CREATE TABLE IF NOT EXISTS video_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    watch_time INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_video_date (video_id, date)
);

-- Analytics summary table
CREATE TABLE IF NOT EXISTS analytics_summary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    total_videos INT DEFAULT 0,
    total_views INT DEFAULT 0,
    total_likes INT DEFAULT 0,
    total_shares INT DEFAULT 0,
    total_watch_time INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_uploads INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Video tags relationship table
CREATE TABLE IF NOT EXISTS video_tags (
    video_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (video_id, tag_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT IGNORE INTO categories (name, description, slug, color) VALUES
('Entertainment', 'Video hiburan dan komedi', 'entertainment', '#ff6b6b'),
('Education', 'Video edukasi dan pembelajaran', 'education', '#4ecdc4'),
('Technology', 'Video teknologi dan gadget', 'technology', '#45b7d1'),
('Music', 'Video musik dan cover', 'music', '#f9ca24'),
('Sports', 'Video olahraga dan fitness', 'sports', '#6c5ce7'),
('Food', 'Video kuliner dan resep', 'food', '#fd79a8'),
('Travel', 'Video perjalanan dan wisata', 'travel', '#00b894'),
('Lifestyle', 'Video gaya hidup dan fashion', 'lifestyle', '#e17055');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_series ON videos(series_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_video_stats_date ON video_stats(date);
CREATE INDEX IF NOT EXISTS idx_video_stats_video_date ON video_stats(video_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_series_category ON series(category_id);
CREATE INDEX IF NOT EXISTS idx_video_interactions_video ON video_interactions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_interactions_type ON video_interactions(interaction_type);
`;

    fs.writeFileSync('schema.sql', schemaContent);
    colorLog('✅ Database schema file created!', 'green');
}

async function main() {
    try {
        console.clear();
        
        // Check if .env already exists
        if (fs.existsSync('.env')) {
            const overwrite = await question('⚠️ .env file already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                colorLog('Setup cancelled.', 'yellow');
                rl.close();
                return;
            }
        }

        // Create schema file
        await createSchemaFile();

        // Get configuration from user
        const config = await setupEnvironment();

        // Create .env file
        await createEnvFile(config);

        // Create directories
        await createDirectories();

        // Setup database
        await createDatabase(config);

        // Test Wasabi connection
        await testWasabiConnection(config);

        // Install dependencies (optional, user might have done this already)
        const installDeps = await question('\n📦 Install NPM dependencies? (Y/n): ');
        if (installDeps.toLowerCase() !== 'n' && installDeps.toLowerCase() !== 'no') {
            await installDependencies();
        }

        // Success message
        colorLog('\n🎉 Setup completed successfully!', 'green');
        colorLog('=====================================', 'green');
        console.log('Your ShortVideo platform is ready to use!');
        console.log('');
        colorLog('Next steps:', 'cyan');
        console.log('1. Start the server: npm start');
        console.log(`2. Open your browser: http://localhost:${config.PORT}`);
        console.log(`3. Access admin panel: http://localhost:${config.PORT}/admin`);
        console.log(`4. Login with: ${config.ADMIN_USERNAME} / ${config.ADMIN_PASSWORD}`);
        console.log('');
        colorLog('Important notes:', 'yellow');
        console.log('- Change your admin password after first login');
        console.log('- Make sure your Wasabi bucket has proper CORS settings');
        console.log('- Check the logs/ directory for application logs');
        console.log('- Backup your database regularly');
        console.log('');

    } catch (error) {
        colorLog(`\n❌ Setup failed: ${error.message}`, 'red');
        console.log('');
        colorLog('Troubleshooting tips:', 'yellow');
        console.log('1. Make sure MySQL is running and accessible');
        console.log('2. Verify your Wasabi credentials and bucket name');
        console.log('3. Check network connectivity');
        console.log('4. Run setup again with correct information');
        console.log('');
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    colorLog('\n\n👋 Setup cancelled by user', 'yellow');
    rl.close();
    process.exit(0);
});

// Run setup
main();