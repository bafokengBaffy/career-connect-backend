// middleware/dataSanitizer.js
const logger = require('../utils/logger');

/**
 * Data Sanitization Middleware
 * Masks sensitive data and sanitizes inputs
 */
const dataSanitizer = (req, res, next) => {
  // Mask sensitive data in logs
  const maskSensitiveData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn', 'cvNumber', 'bankAccount'];
    const masked = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    });
    
    return masked;
  };
  
  // Store original body for processing
  req._originalBody = req.body ? { ...req.body } : {};
  req.body = maskSensitiveData(req.body);
  
  // Sanitize all string inputs
  const sanitize = (input) => {
    if (typeof input === 'string') {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\\/g, '&#x5C;')
        .replace(/`/g, '&#x60;');
    }
    return input;
  };
  
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize(req.query[key]);
      }
    }
  }
  
  next();
};

module.exports = dataSanitizer;