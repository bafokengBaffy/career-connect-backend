// @ts-nocheck
// backend/config/arcjet.js
const arcjet = require('@arcjet/node');
const { isSpoofedBot } = require('@arcjet/inspect');
const logger = require('../utils/logger');

class ArcjetConfig {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    if (!process.env.ARCJET_KEY) {
      logger.warn('ARCJET_KEY not found. Arcjet protection disabled.');
      return null;
    }

    try {
      this.client = arcjet({
        key: process.env.ARCJET_KEY,
        rules: [
          // Shield protection against common attacks (SQL injection, XSS, etc.)
          arcjet.shield({
            mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
          }),

          // Bot detection with category-based rules
          arcjet.detectBot({
            mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
            allow: [
              'CATEGORY:SEARCH_ENGINE', // Google, Bing, etc.
              'CATEGORY:MONITOR', // Uptime monitoring services
              'CATEGORY:PREVIEW', // Link previews (Slack, Discord, etc.)
              'CATEGORY:FEED_FETCHER', // RSS feed readers
            ],
          }),

          // Rate limiting with token bucket algorithm
          arcjet.tokenBucket({
            mode: 'LIVE',
            refillRate: 40, // Refill 40 tokens
            interval: 60, // per 60 seconds
            capacity: 100, // Bucket capacity of 100 tokens
          }),

          // Email validation for auth endpoints
          arcjet.validateEmail({
            mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
            block: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
          }),
        ],
      });

      this.initialized = true;
      logger.info('✅ Arcjet initialized successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Arcjet', { error: error.message });
      return null;
    }
  }

  getClient() {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.client;
  }

  // Middleware factory for different protection levels
  createMiddleware(options = {}) {
    const {
      shield = true,
      botDetection = true,
      rateLimit = true,
      emailValidation = false,
      mode = 'LIVE'
    } = options;

    return async (req, res, next) => {
      try {
        const client = this.getClient();
        if (!client) {
          return next(); // Arcjet not available, continue
        }

        // Skip Arcjet for health checks and whitelisted IPs
        if (req.path === '/health' || req.path === '/ready' || req.path === '/live') {
          return next();
        }

        // Prepare Arcjet protection
        const decisions = [];

        if (shield) {
          decisions.push(client.shield({ mode }));
        }

        if (botDetection) {
          decisions.push(client.detectBot({
            mode,
            allow: [
              'CATEGORY:SEARCH_ENGINE',
              'CATEGORY:MONITOR',
              'CATEGORY:PREVIEW',
            ],
          }));
        }

        if (rateLimit) {
          decisions.push(client.tokenBucket({
            mode: 'LIVE',
            refillRate: 40,
            interval: 60,
            capacity: 100,
          }));
        }

        if (emailValidation && req.body?.email) {
          decisions.push(client.validateEmail({
            mode,
            block: ['DISPOSABLE', 'INVALID'],
          }));
        }

        // Run protection
        const decision = await client.protect(req, {
          email: req.body?.email,
          requested: rateLimit ? 5 : undefined, // Deduct tokens based on request
        });

        // Log decision for debugging
        logger.debug('Arcjet decision', {
          path: req.path,
          ip: req.ip,
          decision: decision,
          isDenied: decision.isDenied(),
          reason: decision.reason,
        });

        // Handle denial
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            logger.warn('Arcjet rate limit exceeded', {
              ip: req.ip,
              path: req.path
            });
            return res.status(429).json({
              success: false,
              error: 'Too many requests',
              retryAfter: decision.reason.resetTime,
              timestamp: new Date().toISOString()
            });
          }

          if (decision.reason.isBot()) {
            logger.warn('Arcjet bot detected', {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              path: req.path
            });
            return res.status(403).json({
              success: false,
              error: 'Bot traffic not allowed',
              timestamp: new Date().toISOString()
            });
          }

          if (decision.reason.isEmail()) {
            logger.warn('Arcjet invalid email', {
              ip: req.ip,
              email: req.body?.email,
              reason: decision.reason.emailTypes
            });
            return res.status(400).json({
              success: false,
              error: 'Invalid email address',
              details: decision.reason.emailTypes,
              timestamp: new Date().toISOString()
            });
          }

          // Shield or other protection
          logger.warn('Arcjet blocked request', {
            ip: req.ip,
            reason: decision.reason,
            path: req.path
          });
          return res.status(403).json({
            success: false,
            error: 'Request blocked by security policy',
            timestamp: new Date().toISOString()
          });
        }

        // Check for spoofed bots (requires paid Arcjet plan)
        if (decision.results.some(isSpoofedBot)) {
          logger.warn('Arcjet spoofed bot detected', {
            ip: req.ip,
            path: req.path
          });
          return res.status(403).json({
            success: false,
            error: 'Suspicious bot activity detected',
            timestamp: new Date().toISOString()
          });
        }

        // Check for hosting/VPN IPs
        if (decision.ip.isHosting()) {
          logger.warn('Arcjet hosting IP detected', {
            ip: req.ip,
            path: req.path
          });
          // You might want to allow or block based on your use case
          // For auth endpoints, you might want to block
          if (req.path.startsWith('/api/auth')) {
            return res.status(403).json({
              success: false,
              error: 'Access denied from hosting provider',
              timestamp: new Date().toISOString()
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Arcjet middleware error', { error: error.message });
        next(); // Fail open - continue if Arcjet fails
      }
    };
  }
}

module.exports = new ArcjetConfig();