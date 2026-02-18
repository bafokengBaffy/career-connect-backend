// middleware/requestLogger.js
const logger = require('../utils/logger');

/**
 * Custom Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user ? req.user.id : 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.info('Request completed', logData);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = requestLogger;