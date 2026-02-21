// @ts-nocheck
/**
 * Jest Setup File
 * Configures test environment with proper mocks and cleanup
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { setupFirebaseMock } = require('../mocks/firebase.mock');
const { setupCloudinaryMock } = require('../mocks/cloudinary.mock');
const { setupRedisMock } = require('../mocks/redis.mock');

// Extend timeout for tests
jest.setTimeout(30000);

// Setup environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-minimum!!!!';

// Mock external services
setupFirebaseMock();
setupCloudinaryMock();
setupRedisMock();

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.generateTestToken = (userId, role = 'user') => {
  return jwt.sign(
    { 
      id: userId, 
      role,
      email: `test-${userId}@example.com` 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

global.generateTestRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await MongoMemoryServer.stop();
});