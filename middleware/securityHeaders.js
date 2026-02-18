// middleware/securityHeaders.js
const logger = require('../utils/logger'); // Changed from './utils/logger'

/**
 * Security Headers Middleware
 * Implements various security headers for OWASP compliance
 */
const securityHeaders = (req, res, next) => {
  // Remove server header
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // HSTS - Force HTTPS (production only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Expect-CT (Certificate Transparency)
  res.setHeader('Expect-CT', 'max-age=86400, enforce');
  
  // Feature Policy (modern browsers)
  res.setHeader('Feature-Policy', 
    "geolocation 'none'; microphone 'none'; camera 'none'"
  );
  
  next();
};

module.exports = securityHeaders;