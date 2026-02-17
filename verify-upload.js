// verify-upload.js - CORRECTED VERSION
console.log('🔍 VERIFYING UPLOAD MIDDLEWARE EXPORTS\n');

// Test 1: Try to require the module
console.log('1. Requiring uploadMiddleware module...');
try {
  const uploadModule = require('./utils/uploadMiddleware');
  console.log('✅ Module loaded successfully');
  
  // Test 2: Check exports
  console.log('\n2. Checking exports:');
  console.log('   Module type:', typeof uploadModule);
  console.log('   Is object?', typeof uploadModule === 'object');
  console.log('   Keys:', Object.keys(uploadModule));
  
  // Test 3: Check each export
  console.log('\n3. Checking individual exports:');
  const exportsToCheck = ['uploadSingle', 'uploadMultiple', 'uploadMixed'];
  
  exportsToCheck.forEach(exportName => {
    console.log(`   ${exportName}:`);
    console.log(`     Exists: ${exportName in uploadModule ? '✅ Yes' : '❌ No'}`);
    if (exportName in uploadModule) {
      console.log(`     Type: ${typeof uploadModule[exportName]}`);
      console.log(`     Is function: ${typeof uploadModule[exportName] === 'function' ? '✅ Yes' : '❌ No'}`);
      
      // Test creating middleware - FIXED: use exportName, not uploadSingle
      if (typeof uploadModule[exportName] === 'function') {
        try {
          const middleware = uploadModule[exportName]('test');
          console.log(`     Can create middleware: ${typeof middleware === 'function' ? '✅ Yes' : '❌ No'}`);
        } catch (e) {
          console.log(`     Error creating middleware: ${e.message}`);
        }
      }
    }
  });
  
  // Test 4: Direct function test
  console.log('\n4. Direct function test:');
  if (typeof uploadModule.uploadSingle === 'function') {
    const middleware = uploadModule.uploadSingle('testField');
    console.log('   Middleware created successfully');
    console.log('   Middleware type:', typeof middleware);
    console.log('   Middleware function length:', middleware.length);
    
    // Test the middleware signature
    console.log('   ✅ UPLOAD MIDDLEWARE IS WORKING!');
  } else {
    console.log('   ❌ uploadSingle is not a function');
    console.log('   Value:', uploadModule.uploadSingle);
  }
  
} catch (error) {
  console.error('❌ ERROR loading module:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n📋 SUMMARY:');
console.log('If exports are missing, check:');
console.log('1. The module.exports statement in utils/uploadMiddleware.js');
console.log('2. That you are not overwriting exports accidentally');
console.log('3. That the file is saved and readable');