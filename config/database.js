const mysql = require('mysql2');
require('dotenv').config();

// Membuat connection pool untuk performa yang lebih baik
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'short_video_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    // Tambahan konfigurasi untuk kompatibilitas
    supportBigNumbers: true,
    bigNumberStrings: true,
    charset: 'utf8mb4',
    timezone: '+00:00'
});

// Test koneksi database
pool.on('connection', function (connection) {
    console.log('✅ Database connected as id ' + connection.threadId);
});

pool.on('error', function(err) {
    console.error('❌ Database error:', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Attempting to reconnect to database...');
    } else {
        throw err;
    }
});

// Menggunakan promise untuk async/await
const promisePool = pool.promise();

module.exports = promisePool;