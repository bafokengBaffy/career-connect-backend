// utils/uploadMiddleware.js - SIMPLIFIED WORKING VERSION
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary').cloudinary;

console.log('🚀 INITIALIZING UPLOAD MIDDLEWARE');

// Check dependencies
if (!multer) {
  throw new Error('Multer is required. Install with: npm install multer');
}

// Create memory storage (we'll handle Cloudinary upload in controller)
const storage = multer.memoryStorage();

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    console.log(`📄 Checking file: ${file.originalname} (${file.mimetype})`);
    
    const allowedMimeTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Videos
      'video/mp4', 'video/mpeg'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Supported: images, PDF, Word, Excel, text, videos`), false);
    }
  }
});

console.log('✅ Multer instance created');

// Create middleware functions
const uploadSingle = (fieldName) => {
  console.log(`📤 Creating single upload middleware for field: ${fieldName}`);
  const middleware = upload.single(fieldName);
  
  // Wrap middleware to add better error handling
  return (req, res, next) => {
    console.log(`🔄 Executing uploadSingle for ${fieldName}`);
    middleware(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: 'File size exceeds 10MB limit'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files',
            message: 'Maximum 10 files allowed'
          });
        }
        if (err.message.includes('File type')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: err.message
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Upload failed',
          message: err.message
        });
      }
      
      console.log(`✅ File processed: ${req.file ? req.file.originalname : 'No file'}`);
      next();
    });
  };
};

const uploadMultiple = (fieldName, maxCount = 10) => {
  console.log(`📤 Creating multiple upload middleware for field: ${fieldName}, max: ${maxCount}`);
  const middleware = upload.array(fieldName, maxCount);
  
  return (req, res, next) => {
    console.log(`🔄 Executing uploadMultiple for ${fieldName}`);
    middleware(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large',
            message: 'File size exceeds 10MB limit'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files',
            message: `Maximum ${maxCount} files allowed`
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Upload failed',
          message: err.message
        });
      }
      
      console.log(`✅ Files processed: ${req.files ? req.files.length : 0} files`);
      next();
    });
  };
};

const uploadMixed = (fields) => {
  console.log(`📤 Creating mixed upload middleware for fields:`, fields);
  const middleware = upload.fields(fields);
  
  return (req, res, next) => {
    console.log(`🔄 Executing uploadMixed`);
    middleware(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        return res.status(400).json({
          success: false,
          error: 'Upload failed',
          message: err.message
        });
      }
      next();
    });
  };
};

// Export middleware
module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadMixed
};

console.log('✅ Upload middleware ready for use');