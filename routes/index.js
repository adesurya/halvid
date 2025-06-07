const express = require('express');
const router = express.Router();
const VideoController = require('../controllers/VideoController');

// Halaman utama
router.get('/', VideoController.index);

// Detail video
router.get('/video/:id', VideoController.show);

// Pencarian video
router.get('/search', VideoController.search);

// Like video (AJAX)
router.post('/video/:id/like', VideoController.like);

// API endpoints
router.get('/api/videos', VideoController.getVideosAPI);

module.exports = router;