// debug-cloudinary.js - UPDATED VERSION
require('dotenv').config(); // Add this at the top

console.log('🔍 Debugging Cloudinary and Multer setup...\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
console.log('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'Not set');
console.log('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set (hidden)' : 'Not set');
console.log('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set (hidden)' : 'Not set');

// 2. Try to require cloudinary
console.log('\n2. Testing Cloudinary module:');
try {
  const cloudinary = require('cloudinary').v2;
  console.log('   ✅ Cloudinary package is installed');
  
  // Configure it
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  console.log('   ✅ Cloudinary configured with cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
} catch (error) {
  console.log('   ❌ Cloudinary error:', error.message);
  console.log('   💡 Run: npm install cloudinary');
}

// 3. Try to require multer
console.log('\n3. Testing Multer module:');
try {
  const multer = require('multer');
  console.log('   ✅ Multer package is installed');
  console.log('   Multer version:', multer.name || 'unknown');
} catch (error) {
  console.log('   ❌ Multer error:', error.message);
  console.log('   💡 Run: npm install multer');
}

// 4. Test uploadMiddleware
console.log('\n4. Testing uploadMiddleware:');
try {
  console.log('   Loading uploadMiddleware from utils/uploadMiddleware.js');
  const uploadMiddleware = require('./utils/uploadMiddleware');
  console.log('   ✅ uploadMiddleware loaded');
  console.log('   Module exports:', Object.keys(uploadMiddleware));
  console.log('   uploadSingle type:', typeof uploadMiddleware.uploadSingle);
  console.log('   uploadMultiple type:', typeof uploadMiddleware.uploadMultiple);
  
  // Test if they're functions
  if (typeof uploadMiddleware.uploadSingle === 'function') {
    console.log('   ✅ uploadSingle is a proper function');
    // Test creating middleware
    const singleMiddleware = uploadMiddleware.uploadSingle('test');
    console.log('   Single middleware created, type:', typeof singleMiddleware);
  } else {
    console.log('   ❌ uploadSingle is not a function:', typeof uploadMiddleware.uploadSingle);
  }
} catch (error) {
  console.log('   ❌ uploadMiddleware error:', error.message);
  console.log('   Error stack:', error.stack);
}

// 5. Test uploadController
console.log('\n5. Testing uploadController:');
try {
  const uploadController = require('./controllers/uploadController');
  console.log('   ✅ uploadController loaded');
  console.log('   Available methods:', Object.keys(uploadController));
} catch (error) {
  console.log('   ❌ uploadController error:', error.message);
}

console.log('\n🔧 Summary:');
console.log('If you see errors above, run: npm install cloudinary multer');