// middleware/requestId.js
const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware for tracing requests across the system
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = requestIdMiddleware;