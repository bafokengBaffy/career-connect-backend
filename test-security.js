// @ts-nocheck
// test-security.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testSecurity() {
  console.log('🔒 Testing Security Middleware...\n');

  // Test 1: Health check
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Rate limiting
  console.log('\n⏱️  Testing rate limiting...');
  for (let i = 0; i < 12; i++) {
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`✅ Rate limit triggered after ${i + 1} attempts`);
        console.log('   Response:', error.response.data);
        break;
      }
    }
  }

  // Test 3: Bot detection
  console.log('\n🤖 Testing bot detection...');
  try {
    await axios.get(`${BASE_URL}/api/data`, {
      headers: { 'User-Agent': 'python-requests/2.28.1' }
    });
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Bot detected and blocked');
      console.log('   Response:', error.response.data);
    }
  }

  // Test 4: Request size limit
  console.log('\n📦 Testing request size limit...');
  try {
    await axios.post(`${BASE_URL}/api/upload`, {
      data: 'x'.repeat(11 * 1024 * 1024) // 11MB
    });
  } catch (error) {
    if (error.response?.status === 413) {
      console.log('✅ Request size limit enforced');
      console.log('   Response:', error.response.data);
    }
  }
}

testSecurity();