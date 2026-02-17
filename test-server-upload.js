// test-server-upload.js
const request = require('supertest');
const { app } = require('./server');

async function testServerUpload() {
  console.log('🧪 TESTING SERVER UPLOAD INTEGRATION\n');
  
  console.log('1. Testing server status:');
  try {
    const res = await request(app).get('/health');
    console.log(`   ✅ Health check: ${res.status} - ${res.body.status}`);
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }
  
  console.log('\n2. Testing debug endpoints:');
  try {
    const res = await request(app).get('/api/debug/server-status');
    console.log(`   ✅ Server status: ${res.status}`);
    
    if (res.body.environment) {
      console.log(`   Firebase: ${res.body.environment.firebaseInitialized ? '✅' : '❌'}`);
      console.log(`   Cloudinary: ${res.body.environment.cloudinaryConfigured ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.log(`   ❌ Server status failed: ${error.message}`);
  }
  
  console.log('\n3. Testing upload routes exist:');
  const uploadRoutes = [
    { method: 'POST', path: '/api/uploads/upload' },
    { method: 'POST', path: '/api/uploads/upload/multiple' }
  ];
  
  for (const route of uploadRoutes) {
    try {
      // Test OPTIONS for CORS preflight
      const res = await request(app).options(route.path);
      console.log(`   ${route.method} ${route.path}: ${res.status >= 200 && res.status < 300 ? '✅ Available' : '❌ Not available'}`);
    } catch (error) {
      console.log(`   ${route.method} ${route.path}: ❌ Error - ${error.message}`);
    }
  }
  
  console.log('\n🎉 Server upload integration test complete!');
}

// If run directly
if (require.main === module) {
  testServerUpload().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testServerUpload;