// utils/gracefulShutdown.js
const logger = require('./logger');

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10 seconds

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server, redisClient) => async (signal) => {
  logger.info(`🛑 Received ${signal}, initiating graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('✅ HTTP server closed');
  });
  
  // Close Redis connection if exists
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('⏰ Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);
  
  // Exit process
  setTimeout(() => {
    logger.info('👋 Graceful shutdown complete');
    process.exit(0);
  }, 1000);
};

/**
 * Setup process signal handlers
 */
const setupShutdownHandlers = (server, redisClient) => {
  const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  const shutdownHandler = gracefulShutdown(server, redisClient);
  
  shutdownSignals.forEach(signal => {
    process.on(signal, () => shutdownHandler(signal));
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('💥 UNCAUGHT EXCEPTION', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Don't exit immediately in production, let the error handler deal with it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
  
  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 UNHANDLED REJECTION', {
      reason: reason instanceof Error ? reason.stack : reason,
      promise
    });
  });
};

module.exports = setupShutdownHandlers;