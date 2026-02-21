// @ts-nocheck
// backend/test-arcjet.js
const axios = require('axios');
const logger = require('./utils/logger');

const BASE_URL = 'http://localhost:5001';

async function testArcjet() {
  console.log('🔒 Testing Arcjet Integration...\n');

  // Test 1: Check Arcjet status
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Arcjet Status:', health.data.arcjet);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Test rate limiting with rapid requests
  console.log('\n⏱️  Testing rate limiting (10 rapid requests)...');
  for (let i = 0; i < 10; i++) {
    try {
      const start = Date.now();
      const response = await axios.get(`${BASE_URL}/api/test`);
      const time = Date.now() - start;
      console.log(`   Request ${i + 1}: ${response.status} (${time}ms)`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`✅ Rate limit triggered after ${i + 1} requests`);
        console.log('   Response:', error.response.data);
        break;
      }
    }
  }

  // Test 3: Test bot detection
  console.log('\n🤖 Testing bot detection...');
  const botUserAgents = [
    'python-requests/2.28.1',
    'curl/7.68.0',
    'Go-http-client/1.1',
    'Wget/1.20.3',
    'Java/11.0.15'
  ];

  for (const ua of botUserAgents) {
    try {
      await axios.get(`${BASE_URL}/api/test`, {
        headers: { 'User-Agent': ua }
      });
      console.log(`   ❌ Bot allowed: ${ua}`);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`   ✅ Bot blocked: ${ua}`);
      }
    }
  }

  // Test 4: Test email validation
  console.log('\n📧 Testing email validation...');
  const testEmails = [
    { email: 'test@tempmail.com', expected: 'block' },
    { email: 'user@gmail.com', expected: 'allow' },
    { email: 'invalid', expected: 'block' }
  ];

  for (const test of testEmails) {
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        email: test.email,
        password: 'Test123!'
      });
      console.log(`   ✅ Email allowed: ${test.email}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`   ✅ Email blocked (invalid/disposable): ${test.email}`);
      }
    }
  }

  // Test 5: Test SQL injection protection
  console.log('\n💉 Testing SQL injection protection...');
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users--"
  ];

  for (const payload of sqlPayloads) {
    try {
      await axios.get(`${BASE_URL}/api/users?search=${encodeURIComponent(payload)}`);
      console.log(`   ❌ SQL injection allowed: ${payload}`);
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(`   ✅ SQL injection blocked: ${payload}`);
      }
    }
  }

  console.log('\n✅ Arcjet testing complete!');
}

// Run tests if called directly
if (require.main === module) {
  testArcjet().catch(console.error);
}

module.exports = testArcjet;