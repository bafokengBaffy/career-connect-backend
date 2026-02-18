// middleware/sqlInjectionProtection.js
const logger = require('../utils/logger');

/**
 * SQL Injection Protection Middleware
 * Detects and blocks potential SQL injection attempts
 */
const sqlInjectionProtection = (req, res, next) => {
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 
    'OR', 'AND', 'WHERE', 'FROM', 'TABLE', 'DATABASE',
    'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE'
  ];
  
  const checkObject = (obj, path = '') => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const upperValue = obj[key].toUpperCase();
        for (const keyword of sqlKeywords) {
          if (upperValue.includes(keyword) && 
              (upperValue.includes(keyword + ' ') || 
               upperValue.includes(' ' + keyword) ||
               upperValue === keyword)) {
            logger.warn('Potential SQL injection detected', {
              input: obj[key],
              keyword,
              path: `${path}.${key}`,
              url: req.path,
              ip: req.ip
            });
            return res.status(400).json({
              success: false,
              error: 'Invalid input detected'
            });
          }
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkObject(obj[key], `${path}.${key}`);
      }
    }
  };
  
  if (req.body) checkObject(req.body, 'body');
  if (req.query) checkObject(req.query, 'query');
  if (req.params) checkObject(req.params, 'params');
  
  next();
};

module.exports = sqlInjectionProtection;