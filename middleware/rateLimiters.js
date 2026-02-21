// middleware/security.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const crypto = require('crypto');
const logger = require('../utils/logger');
const arcjet = require('@arcjet/node');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const slowDown = require('express-slow-down');

// Initialize Redis client for distributed rate limiting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

// Connect to Redis (non-blocking)
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection failed', { error: error.message });
  }
})();

// Custom key generator with enhanced fingerprinting
const generateFingerprint = (req) => {
  const components = [
    req.ip || req.connection.remoteAddress,
    req.headers['user-agent'] || 'unknown',
    req.headers['accept-language'] || 'unknown',
    req.headers['accept-encoding'] || 'unknown',
    req.headers['sec-ch-ua'] || 'unknown',
    req.headers['dnt'] || 'unknown'
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('-'))
    .digest('hex');
};

// IP whitelist configuration
const whitelist = new Set([
  '127.0.0.1',
  '::1',
  ...(process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [])
]);

// Bypass check for whitelisted IPs and health checks
const shouldBypass = (req) => {
  return whitelist.has(req.ip) || 
         req.path === '/health' || 
         req.path === '/ready' || 
         req.path === '/live';
};

// ============================================
// ARCVJET CONFIGURATION (Free Tier)
// ============================================
const arcjetClient = arcjet({
  key: process.env.ARCJET_KEY, // Get from arcjet.com
  rules: [
    // Shield protection - detects common attacks
    arcjet.shield({
      mode: "LIVE", // Will block requests
    }),
    
    // Bot detection
    arcjet.bot({
      mode: "LIVE",
      allow: ["Googlebot", "Bingbot", "Slurp", "DuckDuckBot"], // Allow good bots
    }),
    
    // Rate limiting with Arcjet
    arcjet.rateLimit({
      mode: "LIVE",
      characteristics: ["ip.src"], // Track by IP
      window: "1m",
      max: 60,
    }),
    
    // Email validation for auth endpoints
    arcjet.validateEmail({
      mode: "LIVE",
      block: ["DISPOSABLE", "INVALID"], // Block disposable emails
    }),
  ],
});

// Arcjet middleware wrapper
const arcjetMiddleware = async (req, res, next) => {
  // Skip Arcjet for whitelisted IPs
  if (shouldBypass(req)) {
    return next();
  }

  try {
    const decision = await arcjetClient.protect(req, {
      // Add email context for auth endpoints
      email: req.body?.email || req.query?.email,
    });

    if (decision.isDenied()) {
      logger.warn('Arcjet blocked request', {
        ip: req.ip,
        reason: decision.reason,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Request blocked by security policy',
        reason: decision.reason,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Arcjet error', { error: error.message });
    // Fail open - allow request if Arcjet fails
    next();
  }
};

// ============================================
// ENHANCED RATE LIMITERS
// ============================================

// Distributed rate limiter factory
const createDistributedLimiter = (options) => {
  const limiterOptions = {
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: options.message || "Too many requests, please try again later.",
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: (req) => {
      if (shouldBypass(req)) {
        return 'whitelisted';
      }
      return options.keyGenerator ? options.keyGenerator(req) : generateFingerprint(req);
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.headers['user-agent'],
        limiter: options.name
      });
      
      res.status(429).json({
        success: false,
        error: options.errorMessage || 'Rate limit exceeded',
        retryAfter: Math.ceil(options.windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    },
    skip: shouldBypass
  };

  // Use Redis store if available
  if (redisClient.isReady) {
    limiterOptions.store = new RedisStore({
      client: redisClient,
      prefix: `rate-limit:${options.name || 'global'}:`
    });
  }

  return rateLimit(limiterOptions);
};

// Global rate limiter
const globalLimiter = createDistributedLimiter({
  name: 'global',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Global rate limit exceeded',
  errorMessage: 'Too many requests, please try again later.'
});

// Auth rate limiter (stricter)
const authLimiter = createDistributedLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Authentication rate limit exceeded',
  errorMessage: 'Too many authentication attempts. Please try again later.'
});

// Upload rate limiter
const uploadLimiter = createDistributedLimiter({
  name: 'upload',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Upload rate limit exceeded',
  errorMessage: 'Upload limit exceeded. Please try again later.'
});

// API rate limiter
const apiLimiter = createDistributedLimiter({
  name: 'api',
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded',
  errorMessage: 'Too many API requests. Please slow down.'
});

// Sensitive endpoints limiter
const sensitiveLimiter = createDistributedLimiter({
  name: 'sensitive',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: 'Sensitive operation limit exceeded',
  errorMessage: 'Too many sensitive operations. Please try again later.'
});

// ============================================
// SPEED LIMITER (Slow down instead of block)
// ============================================
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes
  delayMs: (hits) => hits * 500, // add 500ms delay per hit above 100
  keyGenerator: generateFingerprint,
  skip: shouldBypass
});

// ============================================
// HELMET CONFIGURATION (Security Headers)
// ============================================
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:3000'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ============================================
// ADVANCED BOT DETECTION (Complementary to Arcjet)
// ============================================
const botDetection = (req, res, next) => {
  if (shouldBypass(req)) {
    return next();
  }

  const ua = req.headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|scraper|python|curl|wget|java|ruby|perl|php/i.test(ua);
  
  // List of allowed bots
  const allowedBots = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot'
  ];
  
  if (isBot) {
    const uaLower = ua.toLowerCase();
    const isAllowedBot = allowedBots.some(bot => uaLower.includes(bot));
    
    if (!isAllowedBot) {
      logger.warn('Suspicious bot detected', {
        ip: req.ip,
        userAgent: ua,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

// ============================================
// REQUEST SIZE LIMITER
// ============================================
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    logger.warn('Request size exceeded', {
      ip: req.ip,
      size: contentLength,
      path: req.path
    });
    
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      maxSize: '10MB',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// ============================================
// COMPRESSION FILTER (Don't compress small responses)
// ============================================
const compressionFilter = (req, res) => {
  if (req.headers['x-no-compression']) {
    return false;
  }
  return compression.filter(req, res);
};

// ============================================
// EXPORT ALL MIDDLEWARE
// ============================================
module.exports = {
  // Arcjet
  arcjetMiddleware,
  
  // Rate Limiters
  globalLimiter,
  authLimiter,
  uploadLimiter,
  apiLimiter,
  sensitiveLimiter,
  
  // Other security middleware
  speedLimiter,
  helmet: helmetConfig,
  mongoSanitize: mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn('MongoDB injection attempt blocked', {
        ip: req.ip,
        key,
        path: req.path
      });
    }
  }),
  xss: xss(),
  hpp: hpp(),
  compression: compression({ filter: compressionFilter }),
  botDetection,
  requestSizeLimiter,
  
  // Utilities
  redisClient,
  generateFingerprint,
  shouldBypass
};