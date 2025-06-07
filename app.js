const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const indexRoutes = require('./routes/index');

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Static files untuk uploads (video dan thumbnail)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/', indexRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Halaman tidak ditemukan',
        error: { status: 404 }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', { 
        message: 'Terjadi kesalahan pada server',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log('Pastikan database MySQL sudah dibuat dan terhubung!');
});

module.exports = app;