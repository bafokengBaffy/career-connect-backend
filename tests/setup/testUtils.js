// @ts-nocheck
/**
 * Test Utilities
 * Helper functions for tests
 */

const request = require('supertest');
const { app } = require('../../server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Create authenticated request
 */
const authenticatedRequest = (token) => {
  const req = request(app);
  req.set('Authorization', `Bearer ${token}`);
  req.set('X-CSRF-Token', 'test-csrf-token');
  return req;
};

/**
 * Generate test user data
 */
const generateTestUser = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    firstName: `Test${timestamp}`,
    lastName: 'User',
    email: `test${timestamp}@example.com`,
    password: 'Test@123456',
    role: 'user',
    isVerified: false,
    isActive: true,
    ...overrides
  };
};

/**
 * Generate test admin data
 */
const generateTestAdmin = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    firstName: `Admin${timestamp}`,
    lastName: 'User',
    email: `admin${timestamp}@example.com`,
    password: 'Admin@123456',
    role: 'admin',
    isVerified: true,
    isActive: true,
    permissions: ['manage_users', 'view_analytics'],
    ...overrides
  };
};

/**
 * Generate test company data
 */
const generateTestCompany = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    name: `Test Company ${timestamp}`,
    email: `company${timestamp}@example.com`,
    phone: '+26612345678',
    description: 'A test company description',
    industry: 'Technology',
    location: {
      city: 'Maseru',
      country: 'Lesotho'
    },
    size: '11-50',
    website: 'https://testcompany.com',
    ...overrides
  };
};

/**
 * Generate malicious payloads for security testing
 */
const maliciousPayloads = {
  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1; DELETE FROM users WHERE '1'='1"
  ],
  
  xssPayloads: [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "<svg onload=alert('xss')>",
    "javascript:alert('xss')",
    "<body onload=alert('xss')>"
  ],
  
  noSqlInjection: [
    { $gt: '' },
    { $ne: null },
    { $where: 'this.password.length > 0' },
    { $regex: '.*' },
    { $nin: [] }
  ],
  
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\windows\\system32',
    '%2e%2e%2fetc%2fpasswd',
    '....//....//etc/passwd'
  ],
  
  commandInjection: [
    '; ls -la',
    '| dir',
    '&& cat /etc/passwd',
    '`whoami`',
    '$(rm -rf /)'
  ]
};

/**
 * Generate large payload for load testing
 */
const generateLargePayload = (size = 1000) => {
  const payload = {};
  for (let i = 0; i < size; i++) {
    payload[`field${i}`] = `value${i}`.repeat(10);
  }
  return payload;
};

/**
 * Validate response structure
 */
const validateResponseStructure = (response, expectedKeys = []) => {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('message');
  
  if (expectedKeys.length > 0) {
    expectedKeys.forEach(key => {
      expect(response.data).toHaveProperty(key);
    });
  }
};

/**
 * Validate error response
 */
const validateErrorResponse = (response, expectedStatus, expectedMessage) => {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('message');
  if (expectedMessage) {
    expect(response.message).toContain(expectedMessage);
  }
};

/**
 * Measure response time
 */
const measureResponseTime = async (requestFn) => {
  const start = Date.now();
  await requestFn();
  const end = Date.now();
  return end - start;
};

/**
 * Run multiple requests concurrently
 */
const runConcurrentRequests = async (requestFn, count = 10) => {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(requestFn());
  }
  return await Promise.all(promises);
};

module.exports = {
  authenticatedRequest,
  generateTestUser,
  generateTestAdmin,
  generateTestCompany,
  maliciousPayloads,
  generateLargePayload,
  validateResponseStructure,
  validateErrorResponse,
  measureResponseTime,
  runConcurrentRequests
};