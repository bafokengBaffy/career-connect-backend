// middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Custom key generator for more accurate rate limiting
const generateKey = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress;
  return crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex');
};

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: generateKey,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
    });
  }
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 attempts per 15 minutes
  message: {
    success: false,
    error: "Too many authentication attempts",
    timestamp: new Date().toISOString()
  },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Only 20 uploads per hour per IP
  message: {
    success: false,
    error: "Upload limit exceeded",
    timestamp: new Date().toISOString()
  }
});

// API rate limiter for specific endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: "Too many API requests",
    timestamp: new Date().toISOString()
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  apiLimiter
};