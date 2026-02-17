#!/usr/bin/env node

/**
 * Security Audit Script for Career Connect Lesotho
 * Run with: node scripts/security-audit.js
 */

const https = require('https');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║     Career Connect Lesotho - Security Audit Tool          ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

// Configuration
const TARGET_URL = process.env.TARGET_URL || 'https://career-connect-backend-gp8u.onrender.com';
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID || 'career-connect-lesotho';

const auditResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper to make HTTPS requests
const makeRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', reject);
    req.end();
  });
};

// Test 1: Check if Firebase is exposed
const testFirebaseExposure = async () => {
  console.log(`${colors.yellow}[1/10] Testing Firebase Firestore exposure...${colors.reset}`);
  
  try {
    // Try to access Firebase REST API directly
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users`;
    const response = await makeRequest({ method: 'GET', hostname: 'firestore.googleapis.com', path: `/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users` });
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.documents && data.documents.length > 0) {
        auditResults.failed.push('❌ Firebase Firestore is publicly readable! Users collection exposed.');
        console.log(`${colors.red}  ✗ CRITICAL: Firebase Firestore is publicly readable!${colors.reset}`);
        console.log(`  Found ${data.documents.length} user documents exposed`);
      } else {
        auditResults.passed.push('✅ Firebase Firestore access properly restricted');
        console.log(`${colors.green}  ✓ Firebase Firestore access properly restricted${colors.reset}`);
      }
    } else if (response.statusCode === 403 || response.statusCode === 401) {
      auditResults.passed.push('✅ Firebase Firestore access denied (good)');
      console.log(`${colors.green}  ✓ Firebase Firestore access denied (good)${colors.reset}`);
    } else {
      auditResults.warnings.push(`⚠️ Firebase returned status ${response.statusCode}`);
      console.log(`${colors.yellow}  ⚠ Unexpected status: ${response.statusCode}${colors.reset}`);
    }
  } catch (error) {
    auditResults.warnings.push(`⚠️ Could not test Firebase: ${error.message}`);
    console.log(`${colors.yellow}  ⚠ Could not test Firebase: ${error.message}${colors.reset}`);
  }
};

// Test 2: Check security headers
const testSecurityHeaders = async () => {
  console.log(`\n${colors.yellow}[2/10] Checking security headers...${colors.reset}`);
  
  try {
    const response = await makeRequest({ 
      method: 'HEAD', 
      hostname: new URL(TARGET_URL).hostname,
      path: new URL(TARGET_URL).pathname,
      port: 443
    });
    
    const headers = response.headers;
    const requiredHeaders = [
      { name: 'strict-transport-security', desc: 'HSTS' },
      { name: 'x-content-type-options', desc: 'X-Content-Type-Options' },
      { name: 'x-frame-options', desc: 'X-Frame-Options' },
      { name: 'x-xss-protection', desc: 'X-XSS-Protection' },
      { name: 'content-security-policy', desc: 'CSP' }
    ];
    
    requiredHeaders.forEach(header => {
      if (headers[header.name]) {
        auditResults.passed.push(`✅ ${header.desc} header present`);
        console.log(`${colors.green}  ✓ ${header.desc} header present${colors.reset}`);
      } else {
        auditResults.warnings.push(`⚠️ ${header.desc} header missing`);
        console.log(`${colors.yellow}  ⚠ ${header.desc} header missing${colors.reset}`);
      }
    });
    
    // Check for server info disclosure
    if (headers.server) {
      auditResults.warnings.push(`⚠️ Server header exposes: ${headers.server}`);
      console.log(`${colors.yellow}  ⚠ Server header exposes: ${headers.server}${colors.reset}`);
    }
    
    if (headers['x-powered-by']) {
      auditResults.warnings.push(`⚠️ X-Powered-By header exposes: ${headers['x-powered-by']}`);
      console.log(`${colors.yellow}  ⚠ X-Powered-By header exposes: ${headers['x-powered-by']}${colors.reset}`);
    }
    
  } catch (error) {
    auditResults.failed.push(`❌ Could not check security headers: ${error.message}`);
    console.log(`${colors.red}  ✗ Could not check security headers: ${error.message}${colors.reset}`);
  }
};

// Test 3: Check CORS configuration
const testCORS = async () => {
  console.log(`\n${colors.yellow}[3/10] Testing CORS configuration...${colors.reset}`);
  
  try {
    const response = await makeRequest({ 
      method: 'OPTIONS',
      hostname: new URL(TARGET_URL).hostname,
      path: new URL(TARGET_URL).pathname,
      port: 443,
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    if (response.headers['access-control-allow-origin'] === '*') {
      auditResults.failed.push('❌ CORS allows all origins (*)');
      console.log(`${colors.red}  ✗ CORS allows all origins (*) - VULNERABLE${colors.reset}`);
    } else if (response.headers['access-control-allow-origin']) {
      auditResults.passed.push('✅ CORS properly restricted');
      console.log(`${colors.green}  ✓ CORS properly restricted${colors.reset}`);
    } else {
      auditResults.passed.push('✅ CORS not overly permissive');
      console.log(`${colors.green}  ✓ CORS not overly permissive${colors.reset}`);
    }
  } catch (error) {
    auditResults.warnings.push(`⚠️ Could not test CORS: ${error.message}`);
    console.log(`${colors.yellow}  ⚠ Could not test CORS: ${error.message}${colors.reset}`);
  }
};

// Test 4: Check API endpoint security
const testAPIEndpoints = async () => {
  console.log(`\n${colors.yellow}[4/10] Testing API endpoint security...${colors.reset}`);
  
  const endpoints = [
    '/api/auth/users',
    '/api/auth/profile',
    '/api/institutions',
    '/api/courses',
    '/api/companies'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest({ 
        method: 'GET',
        hostname: new URL(TARGET_URL).hostname,
        path: endpoint,
        port: 443
      });
      
      if (response.statusCode === 200) {
        if (endpoint.includes('/users') && !endpoint.includes('profile')) {
          auditResults.failed.push(`❌ ${endpoint} is publicly accessible - exposes user data`);
          console.log(`${colors.red}  ✗ ${endpoint} is publicly accessible - exposes user data${colors.reset}`);
        } else {
          auditResults.warnings.push(`⚠️ ${endpoint} returns ${response.statusCode} without auth`);
          console.log(`${colors.yellow}  ⚠ ${endpoint} returns ${response.statusCode} without auth${colors.reset}`);
        }
      } else if (response.statusCode === 401 || response.statusCode === 403) {
        auditResults.passed.push(`✅ ${endpoint} properly requires authentication`);
        console.log(`${colors.green}  ✓ ${endpoint} properly requires authentication${colors.reset}`);
      } else {
        console.log(`${colors.blue}  ℹ ${endpoint} returned ${response.statusCode}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}  ⚠ Could not test ${endpoint}: ${error.message}${colors.reset}`);
    }
  }
};

// Test 5: Check for exposed environment variables
const testEnvExposure = () => {
  console.log(`\n${colors.yellow}[5/10] Checking for environment variable exposure...${colors.reset}`);
  
  const envVars = process.env;
  const sensitiveVars = ['JWT_SECRET', 'SESSION_SECRET', 'FIREBASE_PRIVATE_KEY'];
  
  sensitiveVars.forEach(varName => {
    if (envVars[varName]) {
      if (envVars[varName].length < 32) {
        auditResults.warnings.push(`⚠️ ${varName} is too short (${envVars[varName].length} chars)`);
        console.log(`${colors.yellow}  ⚠ ${varName} is too short (${envVars[varName].length} chars)${colors.reset}`);
      } else {
        auditResults.passed.push(`✅ ${varName} has good length`);
        console.log(`${colors.green}  ✓ ${varName} configured properly${colors.reset}`);
      }
    } else {
      auditResults.failed.push(`❌ ${varName} not set in environment`);
      console.log(`${colors.red}  ✗ ${varName} not set in environment${colors.reset}`);
    }
  });
};

// Test 6: Check package vulnerabilities
const testNPMVulnerabilities = async () => {
  console.log(`\n${colors.yellow}[6/10] Checking for npm vulnerabilities...${colors.reset}`);
  
  try {
    const { stdout, stderr } = await exec('npm audit --json');
    const audit = JSON.parse(stdout);
    
    if (audit.metadata.vulnerabilities.total === 0) {
      auditResults.passed.push('✅ No npm vulnerabilities found');
      console.log(`${colors.green}  ✓ No npm vulnerabilities found${colors.reset}`);
    } else {
      auditResults.warnings.push(`⚠️ Found ${audit.metadata.vulnerabilities.total} npm vulnerabilities`);
      console.log(`${colors.yellow}  ⚠ Found ${audit.metadata.vulnerabilities.total} npm vulnerabilities${colors.reset}`);
      
      if (audit.metadata.vulnerabilities.high > 0) {
        auditResults.failed.push(`❌ ${audit.metadata.vulnerabilities.high} high severity vulnerabilities`);
        console.log(`${colors.red}  ✗ ${audit.metadata.vulnerabilities.high} high severity vulnerabilities${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.blue}  ℹ npm audit not available or failed${colors.reset}`);
  }
};

// Test 7: Check for rate limiting
const testRateLimiting = async () => {
  console.log(`\n${colors.yellow}[7/10] Testing rate limiting...${colors.reset}`);
  
  const start = Date.now();
  let successCount = 0;
  let rateLimited = false;
  
  // Make 20 rapid requests
  for (let i = 0; i < 20; i++) {
    try {
      const response = await makeRequest({ 
        method: 'GET',
        hostname: new URL(TARGET_URL).hostname,
        path: '/',
        port: 443
      });
      
      if (response.statusCode === 429) {
        rateLimited = true;
        break;
      } else if (response.statusCode === 200) {
        successCount++;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  if (rateLimited) {
    auditResults.passed.push('✅ Rate limiting appears to be enabled');
    console.log(`${colors.green}  ✓ Rate limiting appears to be enabled${colors.reset}`);
  } else if (successCount >= 15) {
    auditResults.warnings.push('⚠️ No rate limiting detected - possible DoS vulnerability');
    console.log(`${colors.yellow}  ⚠ No rate limiting detected - possible DoS vulnerability${colors.reset}`);
  } else {
    console.log(`${colors.blue}  ℹ Rate limiting test inconclusive${colors.reset}`);
  }
};

// Test 8: Check SSL/TLS configuration
const testSSL = async () => {
  console.log(`\n${colors.yellow}[8/10] Checking SSL/TLS configuration...${colors.reset}`);
  
  try {
    // Simple SSL check by making a secure request
    const response = await makeRequest({ 
      method: 'GET',
      hostname: new URL(TARGET_URL).hostname,
      path: '/',
      port: 443
    });
    
    if (response.statusCode) {
      auditResults.passed.push('✅ SSL/TLS connection successful');
      console.log(`${colors.green}  ✓ SSL/TLS connection successful${colors.reset}`);
    }
  } catch (error) {
    auditResults.failed.push('❌ SSL/TLS connection failed');
    console.log(`${colors.red}  ✗ SSL/TLS connection failed: ${error.message}${colors.reset}`);
  }
};

// Test 9: Check for information disclosure in error messages
const testErrorDisclosure = async () => {
  console.log(`\n${colors.yellow}[9/10] Testing error message disclosure...${colors.reset}`);
  
  try {
    const response = await makeRequest({ 
      method: 'GET',
      hostname: new URL(TARGET_URL).hostname,
      path: '/api/nonexistent-endpoint-that-should-404',
      port: 443
    });
    
    if (response.data) {
      try {
        const data = JSON.parse(response.data);
        if (data.stack || data.trace) {
          auditResults.warnings.push('⚠️ Error responses may expose stack traces');
          console.log(`${colors.yellow}  ⚠ Error responses may expose stack traces${colors.reset}`);
        } else {
          auditResults.passed.push('✅ Error messages are safe');
          console.log(`${colors.green}  ✓ Error messages are safe${colors.reset}`);
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
  } catch (error) {
    console.log(`${colors.blue}  ℹ Could not test error disclosure${colors.reset}`);
  }
};

// Test 10: Check file upload security (if applicable)
const testFileUploadSecurity = () => {
  console.log(`\n${colors.yellow}[10/10] Checking file upload configuration...${colors.reset}`);
  
  // Check if upload routes exist and have validation
  const uploadRouteExists = fs.existsSync(path.join(__dirname, '../routes/uploadRoutes.js'));
  const uploadMiddlewareExists = fs.existsSync(path.join(__dirname, '../middleware/uploadMiddleware.js'));
  
  if (uploadRouteExists && uploadMiddlewareExists) {
    // Check upload middleware for validation
    try {
      const uploadMiddleware = require('../middleware/uploadMiddleware');
      if (uploadMiddleware.fileFilter || uploadMiddleware.limits) {
        auditResults.passed.push('✅ File upload validation appears configured');
        console.log(`${colors.green}  ✓ File upload validation appears configured${colors.reset}`);
      } else {
        auditResults.warnings.push('⚠️ File upload may lack proper validation');
        console.log(`${colors.yellow}  ⚠ File upload may lack proper validation${colors.reset}`);
      }
    } catch (e) {
      console.log(`${colors.blue}  ℹ Could not check upload configuration${colors.reset}`);
    }
  } else {
    console.log(`${colors.blue}  ℹ File upload routes not found, skipping${colors.reset}`);
  }
};

// Run all tests
const runAudit = async () => {
  await testFirebaseExposure();
  await testSecurityHeaders();
  await testCORS();
  await testAPIEndpoints();
  testEnvExposure();
  await testNPMVulnerabilities();
  await testRateLimiting();
  await testSSL();
  await testErrorDisclosure();
  testFileUploadSecurity();
  
  // Print summary
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}                     AUDIT SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  
  if (auditResults.passed.length > 0) {
    console.log(`\n${colors.green}PASSED:${colors.reset}`);
    auditResults.passed.forEach(item => console.log(`  ${item}`));
  }
  
  if (auditResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}WARNINGS:${colors.reset}`);
    auditResults.warnings.forEach(item => console.log(`  ${item}`));
  }
  
  if (auditResults.failed.length > 0) {
    console.log(`\n${colors.red}FAILED - CRITICAL:${colors.reset}`);
    auditResults.failed.forEach(item => console.log(`  ${item}`));
  }
  
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}              Audit Complete - ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  
  // Exit with appropriate code
  if (auditResults.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Run the audit
runAudit().catch(error => {
  console.error(`${colors.red}Audit failed:${colors.reset}`, error);
  process.exit(1);
});