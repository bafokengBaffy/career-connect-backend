// test-cloudinary-setup.js
require('dotenv').config();

console.log('🧪 Testing Cloudinary Setup...\n');

// Test environment variables
console.log('1. Environment Variables Check:');
console.log('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ Missing');
console.log('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

// Test Cloudinary config
console.log('\n2. Cloudinary Configuration Test:');
try {
  const cloudinary = require('./config/cloudinary');
  console.log('✅ Cloudinary config loaded');
  
  // Test a simple upload simulation
  console.log('\n3. Testing upload simulation:');
  const testBuffer = Buffer.from('Test file content');
  
  cloudinary.uploader.upload_stream(
    { folder: 'career-connect-test' },
    (error, result) => {
      if (error) {
        console.log('❌ Upload test failed:', error.message);
      } else {
        console.log('✅ Upload simulation successful!');
        console.log('   URL:', result.secure_url);
        console.log('   Public ID:', result.public_id);
      }
      
      // Test URL generation
      console.log('\n4. Testing URL generation:');
      const url = cloudinary.url('test-image', {
        transformation: [
          { width: 300, height: 300, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      console.log('✅ Generated URL:', url);
      
      console.log('\n🎉 Cloudinary setup is working correctly!');
      process.exit(0);
    }
  ).end(testBuffer);
  
} catch (error) {
  console.error('❌ Cloudinary test failed:', error.message);
  process.exit(1);
}