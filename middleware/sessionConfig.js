// middleware/sessionConfig.js
const session = require('express-session');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');
const logger = require('../utils/logger');

let sessionStore;
let redisClient;

/**
 * Initialize Redis session store
 */
const initializeRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          tls: process.env.NODE_ENV === 'production',
          rejectUnauthorized: false,
          keepAlive: 5000
        },
        password: process.env.REDIS_PASSWORD
      });
      
      redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
      });
      
      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });
      
      await redisClient.connect();
      
      sessionStore = new RedisStore({ 
        client: redisClient,
        prefix: 'session:',
        ttl: 86400 // 24 hours in seconds
      });
      
      return { redisClient, sessionStore };
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      return { redisClient: null, sessionStore: null };
    }
  }
  return { redisClient: null, sessionStore: null };
};

/**
 * Session configuration
 */
const getSessionConfig = (store) => {
  return {
    name: 'careerConnect.sid',
    secret: process.env.SESSION_SECRET || 'fallback-secret-must-be-changed-in-production',
    resave: false,
    saveUninitialized: false, // GDPR compliance
    store: store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/'
    },
    rolling: true, // Reset maxAge on each response
    unset: 'destroy'
  };
};

module.exports = {
  initializeRedis,
  getSessionConfig
};