// backend/middleware/index.js
const securityHeaders = require('./securityHeaders');
const requestIdMiddleware = require('./requestId');
const sqlInjectionProtection = require('./sqlInjectionProtection');
const fileUploadValidation = require('./fileUploadValidation');
const authenticateToken = require('./auth');
const requestLogger = require('./requestLogger');
const dataSanitizer = require('./dataSanitizer');
const rateLimiters = require('./rateLimiters');
const applyCsrfProtection = require('./csrf');
const compressionMiddleware = require('./compression');
const helmetConfig = require('./helmetConfig');
const corsMiddleware = require('./corsConfig');
const initializeRedis = require('./sessionConfig');
const getSessionConfig = require('./sessionConfig');
const notFoundHandler = require('./errorHandler').notFoundHandler;
const globalErrorHandler = require('./errorHandler').globalErrorHandler;
const arcjetConfig = require('../config/arcjet');

// Create Arcjet middleware instances for different protection levels
const arcjetMiddleware = arcjetConfig.createMiddleware({
  shield: true,
  botDetection: true,
  rateLimit: true,
  emailValidation: false,
  mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN'
});

const arcjetAuthMiddleware = arcjetConfig.createMiddleware({
  shield: true,
  botDetection: true,
  rateLimit: true,
  emailValidation: true, // Enable email validation for auth
  mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN'
});

const arcjetUploadMiddleware = arcjetConfig.createMiddleware({
  shield: true,
  botDetection: true,
  rateLimit: true,
  emailValidation: false,
  mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN'
});

module.exports = {
  securityHeaders,
  requestIdMiddleware,
  sqlInjectionProtection,
  fileUploadValidation,
  authenticateToken,
  requestLogger,
  dataSanitizer,
  rateLimiters,
  applyCsrfProtection,
  compressionMiddleware,
  helmetConfig,
  corsMiddleware,
  initializeRedis,
  getSessionConfig,
  notFoundHandler,
  globalErrorHandler,
  arcjetMiddleware,
  arcjetAuthMiddleware,
  arcjetUploadMiddleware,
  arcjetConfig
};