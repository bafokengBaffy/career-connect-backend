// routes/uploadRoutes.js - COMPLETE WORKING VERSION
const express = require('express');
const router = express.Router();

console.log('🔄 Loading upload routes...');

// Load upload middleware
const uploadMiddleware = require('../utils/uploadMiddleware');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth');

console.log('✅ Upload middleware loaded successfully');
console.log('   Available functions:', Object.keys(uploadMiddleware));

// Single file upload route
router.post(
  '/upload',
  authMiddleware.protect,
  (req, res, next) => {
    console.log('📤 Single upload route hit');
    console.log('   Headers:', req.headers['content-type']);
    console.log('   Has file?', !!req.file);
    next();
  },
  uploadMiddleware.uploadSingle('file'),
  uploadController.uploadFile
);

// Multiple files upload route
router.post(
  '/upload/multiple',
  authMiddleware.protect,
  (req, res, next) => {
    console.log('📤 Multiple upload route hit');
    next();
  },
  uploadMiddleware.uploadMultiple('files', 10),
  uploadController.uploadMultipleFiles
);

// Delete file route
router.delete(
  '/delete',
  authMiddleware.protect,
  uploadController.deleteFile
);

// Upload from URL route
router.post(
  '/upload/url',
  authMiddleware.protect,
  uploadController.uploadFromUrl
);

// Optimize image route
router.post(
  '/optimize',
  authMiddleware.protect,
  uploadController.optimizeImage
);

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('✅ Upload routes test endpoint hit');
  res.json({
    success: true,
    message: 'Upload routes are working',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ uploadRoutes initialized successfully');
console.log('   Routes registered:', router.stack.map(layer => layer.route?.path).filter(Boolean));

module.exports = router;