// middleware/authentication.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret-change-me', {
      algorithms: ['HS256'],
      maxAge: '7d'
    });
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', {
      error: error.message,
      ip: req.ip,
      url: req.originalUrl
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * Role-based Authorization Middleware
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };