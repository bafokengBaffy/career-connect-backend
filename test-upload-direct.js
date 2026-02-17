// test-upload-direct.js
require('dotenv').config();
const { uploadSingle } = require('./utils/uploadMiddleware');

console.log('🧪 Direct upload middleware test...\n');

// Test if uploadSingle is a function
console.log('1. Testing uploadSingle:');
console.log('   Type:', typeof uploadSingle);
console.log('   Is function?', typeof uploadSingle === 'function');

if (typeof uploadSingle === 'function') {
  console.log('\n2. Creating middleware instance:');
  const middleware = uploadSingle('testFile');
  console.log('   Middleware created:', typeof middleware);
  console.log('   Is function?', typeof middleware === 'function');
  
  console.log('\n3. Testing middleware signature:');
  // Check if it has the right signature
  const funcString = middleware.toString();
  console.log('   Function length (params):', middleware.length);
  console.log('   Function starts with:', funcString.substring(0, 100));
  
  console.log('\n✅ Upload middleware is working correctly!');
} else {
  console.log('\n❌ ERROR: uploadSingle is not a function');
  console.log('   Value:', uploadSingle);
}

console.log('\n🔧 Check your utils/uploadMiddleware.js exports.');