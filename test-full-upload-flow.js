// test-full-upload-flow.js
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testFullUploadFlow() {
  console.log('🧪 TESTING FULL UPLOAD FLOW\n');
  
  const PORT = process.env.PORT || 5001;
  const BASE_URL = `http://localhost:${PORT}`;
  
  // 1. Check if server is running
  console.log('1. Checking server availability...');
  try {
    const healthRes = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    console.log(`   ✅ Server is running (${healthRes.data.status})`);
  } catch (error) {
    console.log(`   ❌ Server not running at ${BASE_URL}`);
    console.log(`   Start server with: npm run dev`);
    return;
  }
  
  // 2. Create test files
  console.log('\n2. Creating test files...');
  const testFiles = [];
  
  for (let i = 0; i < 3; i++) {
    const fileName = `test-upload-${Date.now()}-${i}.txt`;
    const filePath = path.join(__dirname, fileName);
    const content = `Test file ${i}\nCreated: ${new Date().toISOString()}\nContent: This is a test file for upload functionality.`;
    
    fs.writeFileSync(filePath, content);
    testFiles.push({
      path: filePath,
      name: fileName,
      size: fs.statSync(filePath).size
    });
    
    console.log(`   Created: ${fileName} (${testFiles[i].size} bytes)`);
  }
  
  // 3. Test single file upload
  console.log('\n3. Testing single file upload...');
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFiles[0].path));
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/uploads/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    const uploadTime = Date.now() - startTime;
    
    console.log(`   ✅ Upload successful in ${uploadTime}ms`);
    console.log(`   Status: ${response.status}`);
    
    if (response.data.success) {
      console.log(`   File URL: ${response.data.url || 'Not provided'}`);
      console.log(`   Public ID: ${response.data.publicId || 'Not provided'}`);
    }
  } catch (error) {
    console.log(`   ❌ Upload failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  // 4. Test multiple file upload
  console.log('\n4. Testing multiple file upload...');
  try {
    const form = new FormData();
    
    testFiles.forEach((file, index) => {
      form.append('files', fs.createReadStream(file.path));
    });
    
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/uploads/upload/multiple`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    const uploadTime = Date.now() - startTime;
    
    console.log(`   ✅ Multiple upload successful in ${uploadTime}ms`);
    console.log(`   Files uploaded: ${response.data.files?.length || 0}`);
    
    if (response.data.files) {
      console.log(`   First file URL: ${response.data.files[0]?.url || 'Not provided'}`);
    }
  } catch (error) {
    console.log(`   ❌ Multiple upload failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || error.message}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  // 5. Clean up test files
  console.log('\n5. Cleaning up test files...');
  testFiles.forEach(file => {
    try {
      fs.unlinkSync(file.path);
      console.log(`   Deleted: ${file.name}`);
    } catch (error) {
      console.log(`   Failed to delete ${file.name}: ${error.message}`);
    }
  });
  
  console.log('\n🎉 FULL UPLOAD FLOW TEST COMPLETE');
  console.log('\nNext steps:');
  console.log('1. Verify uploads in your Cloudinary dashboard');
  console.log('2. Check if files appear in your Firebase database');
  console.log('3. Test with actual images and PDFs');
}

// Run the test if called directly
if (require.main === module) {
  testFullUploadFlow().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testFullUploadFlow;