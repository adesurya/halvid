// create-admin.js - Script untuk membuat admin user default
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdminUser() {
    let connection;
    
    try {
        console.log('🔄 Connecting to database...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'short_video_db',
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database successfully');

        // Check if admin_users table exists
        console.log('🔄 Checking if admin_users table exists...');
        
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'admin_users'"
        );

        if (tables.length === 0) {
            console.log('📝 Creating admin_users table...');
            
            // Create admin_users table
            await connection.execute(`
                CREATE TABLE admin_users (
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
                )
            `);
            
            console.log('✅ admin_users table created successfully');
        }

        // Check if admin_sessions table exists
        console.log('🔄 Checking if admin_sessions table exists...');
        
        const [sessionTables] = await connection.execute(
            "SHOW TABLES LIKE 'admin_sessions'"
        );

        if (sessionTables.length === 0) {
            console.log('📝 Creating admin_sessions table...');
            
            // Create admin_sessions table
            await connection.execute(`
                CREATE TABLE admin_sessions (
                    id VARCHAR(255) PRIMARY KEY,
                    admin_id INT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
                    INDEX idx_admin_id (admin_id),
                    INDEX idx_expires (expires_at)
                )
            `);
            
            console.log('✅ admin_sessions table created successfully');
        }

        // Check if admin user already exists
        console.log('🔄 Checking if admin user exists...');
        
        const [existingAdmin] = await connection.execute(
            'SELECT id, username FROM admin_users WHERE username = ?',
            ['admin']
        );

        if (existingAdmin.length > 0) {
            console.log('⚠️  Admin user already exists');
            console.log('📋 Updating existing admin user...');
            
            // Update existing admin with new password
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await connection.execute(`
                UPDATE admin_users SET 
                    password = ?,
                    full_name = ?,
                    role = ?,
                    is_active = TRUE,
                    updated_at = NOW()
                WHERE username = ?
            `, [hashedPassword, 'Super Administrator', 'super_admin', 'admin']);
            
            console.log('✅ Admin user updated successfully');
        } else {
            console.log('👤 Creating new admin user...');
            
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            // Create admin user
            const [result] = await connection.execute(`
                INSERT INTO admin_users (
                    username, 
                    email, 
                    password, 
                    full_name, 
                    role,
                    is_active
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                'admin@shortvideo.com',
                hashedPassword,
                'Super Administrator',
                'super_admin',
                true
            ]);
            
            console.log('✅ Admin user created successfully with ID:', result.insertId);
        }

        // Verify admin user
        console.log('🔄 Verifying admin user...');
        
        const [adminUser] = await connection.execute(`
            SELECT id, username, email, full_name, role, is_active, created_at 
            FROM admin_users 
            WHERE username = ?
        `, ['admin']);

        if (adminUser.length > 0) {
            const user = adminUser[0];
            console.log('✅ Admin user verification successful:');
            console.log('   ID:', user.id);
            console.log('   Username:', user.username);
            console.log('   Email:', user.email);
            console.log('   Full Name:', user.full_name);
            console.log('   Role:', user.role);
            console.log('   Active:', user.is_active ? 'Yes' : 'No');
            console.log('   Created:', user.created_at);
        }

        // Test password verification
        console.log('🔄 Testing password verification...');
        
        const [passwordTest] = await connection.execute(
            'SELECT password FROM admin_users WHERE username = ?',
            ['admin']
        );

        if (passwordTest.length > 0) {
            const isValid = await bcrypt.compare('admin123', passwordTest[0].password);
            console.log('🔐 Password test:', isValid ? '✅ Valid' : '❌ Invalid');
        }

        console.log('\n🎉 Setup completed successfully!');
        console.log('📋 Login credentials:');
        console.log('   URL: http://localhost:3000/admin/login');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n⚠️  Remember to change the default password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n💡 Tip: Make sure your database exists and the connection settings in .env are correct');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Tip: Make sure your MySQL server is running');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 Tip: Check your database username and password in .env file');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Helper function to check database connection
async function testDatabaseConnection() {
    try {
        console.log('🔄 Testing database connection...');
        
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'short_video_db'
        });

        const [result] = await connection.execute('SELECT 1 as test');
        await connection.end();
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🎬 ShortVideo Admin User Setup');
    console.log('================================\n');

    // Test database connection first
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
        console.log('\n💡 Please check your database configuration in .env file:');
        console.log('   DB_HOST=localhost');
        console.log('   DB_USER=root');
        console.log('   DB_PASSWORD=your_password');
        console.log('   DB_NAME=short_video_db');
        process.exit(1);
    }

    await createAdminUser();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = { createAdminUser, testDatabaseConnection };