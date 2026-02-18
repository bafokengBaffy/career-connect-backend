// middleware/csrf.js
const csurf = require('csurf');

/**
 * CSRF Protection Middleware
 * Only applies to state-changing methods
 */
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  value: (req) => {
    // Check for token in headers, body, or query
    return req.headers['x-csrf-token'] || 
           req.body._csrf || 
           req.query._csrf;
  }
});

/**
 * Apply CSRF protection to state-changing routes
 */
const applyCsrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    csrfProtection(req, res, next);
  } else {
    next();
  }
};

module.exports = { csrfProtection, applyCsrfProtection };