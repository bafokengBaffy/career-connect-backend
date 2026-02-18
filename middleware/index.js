// middleware/index.js - Central export for all middleware
const securityHeaders = require('./securityHeaders');
const requestIdMiddleware = require('./requestId');
const sqlInjectionProtection = require('./sqlInjectionProtection');
const fileUploadValidation = require('./fileUploadValidation');
const { authenticateToken, authorizeRole } = require('./authentication');
const requestLogger = require('./requestLogger');
const dataSanitizer = require('./dataSanitizer');
const rateLimiters = require('./rateLimiters');
const { applyCsrfProtection } = require('./csrf');
const compressionMiddleware = require('./compression');
const helmetConfig = require('./helmetConfig');
const corsMiddleware = require('./corsConfig');
const { initializeRedis, getSessionConfig } = require('./sessionConfig');
const { notFoundHandler, globalErrorHandler } = require('./errorHandler');

module.exports = {
  securityHeaders,
  requestIdMiddleware,
  sqlInjectionProtection,
  fileUploadValidation,
  authenticateToken,
  authorizeRole,
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
  globalErrorHandler
};