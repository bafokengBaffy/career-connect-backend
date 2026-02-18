// middleware/compression.js
const compression = require('compression');

/**
 * Custom compression middleware with security considerations
 */
const compressionMiddleware = compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1kb
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression's default filter
    return compression.filter(req, res);
  },
  // Prevent compression oracle attacks
  memLevel: 8,
  strategy: 0
});

module.exports = compressionMiddleware;