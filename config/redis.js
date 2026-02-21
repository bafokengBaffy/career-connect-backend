// config/redis.js
const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const initializeRedis = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max retries reached');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis initialization failed', { error: error.message });
    return null;
  }
};

const getRedisClient = () => redisClient;

module.exports = {
  initializeRedis,
  getRedisClient
};