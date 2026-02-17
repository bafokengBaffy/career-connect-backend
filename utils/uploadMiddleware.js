// utils/uploadMiddleware.js - GUARANTEED WORKING VERSION
const multer = require('multer');

console.log('🚀 INITIALIZING UPLOAD MIDDLEWARE');

// Check if multer is loaded
if (!multer) {
  console.error('❌ CRITICAL: Multer not loaded');
  throw new Error('Multer package not installed. Run: npm install multer');
}

console.log('✅ Multer loaded successfully');

// Create the multer instance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: function(req, file, cb) {
    // Accept all files for now
    console.log(`📄 Processing file: ${file.originalname}`);
    cb(null, true);
  }
});

console.log('✅ Multer instance created');

// Define the middleware functions
function createUploadSingle(fieldName) {
  console.log(`📤 Creating single upload for field: ${fieldName}`);
  return upload.single(fieldName);
}

function createUploadMultiple(fieldName, maxCount = 10) {
  console.log(`📤 Creating multiple upload for field: ${fieldName}, max: ${maxCount}`);
  return upload.array(fieldName, maxCount);
}

function createUploadMixed(fields) {
  console.log(`📤 Creating mixed upload for fields:`, fields);
  return upload.fields(fields);
}

// Create the exports object
const exportsObject = {
  uploadSingle: createUploadSingle,
  uploadMultiple: createUploadMultiple,
  uploadMixed: createUploadMixed
};

console.log('✅ Middleware functions defined');
console.log('   Exports object keys:', Object.keys(exportsObject));
console.log('   uploadSingle type:', typeof exportsObject.uploadSingle);

// Export the object
module.exports = exportsObject;

console.log('✅ Upload middleware module exported');