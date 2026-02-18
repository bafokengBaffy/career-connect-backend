// middleware/errorHandler.js
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('404 Not Found', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource does not exist',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
};

/**
 * Global Error Handler
 */
const globalErrorHandler = (error, req, res, next) => {
  const errorId = uuidv4();
  
  // Log error with context
  logger.error('Unhandled error', {
    errorId,
    requestId: req.id,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    name: error.name,
    code: error.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user ? req.user.id : 'anonymous',
    timestamp: new Date().toISOString()
  });
  
  // Determine HTTP status code
  let statusCode = 500;
  let errorMessage = 'Internal Server Error';
  let errorDetails = null;
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation Error';
    errorDetails = error.details;
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Unauthorized';
  } else if (error.name === 'ForbiddenError' || error.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    errorMessage = 'Forbidden';
    if (error.code === 'EBADCSRFTOKEN') {
      errorMessage = 'Invalid CSRF token';
    }
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = 'Not Found';
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    errorMessage = 'Too Many Requests';
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorMessage = 'File too large';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      statusCode = 409;
      errorMessage = 'Duplicate key error';
      errorDetails = { field: Object.keys(error.keyPattern)[0] };
    }
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    errorMessage = 'Invalid JSON payload';
  }
  
  // Construct safe error response
  const response = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    requestId: req.id,
    errorId: process.env.NODE_ENV === 'development' ? errorId : undefined
  };
  
  if (errorDetails && process.env.NODE_ENV !== 'production') {
    response.details = errorDetails;
  }
  
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack.split('\n');
  }
  
  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};