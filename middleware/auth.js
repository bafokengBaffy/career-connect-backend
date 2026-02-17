// @ts-nocheck
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../config/firebase");

// SECURITY: Validate JWT secret
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
};
validateJWTSecret();

// Blacklisted tokens (implement with Redis in production)
const tokenBlacklist = new Set();

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check cookie if no header (for web apps)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route - No token provided",
    });
  }

  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked - Please login again",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: process.env.JWT_EXPIRE || '30d'
    });

    // Get user from the token
    const user = await User.findById(decoded.id);

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Check if user is active
    if (user.status === 'suspended' || user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: "Account is suspended or deleted",
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role || user.userType;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expired - Please login again",
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token - Please login again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role || req.user.userType;

    if (!roles.includes(userRole)) {
      console.warn(`Unauthorized access attempt: User ${req.user.id} with role ${userRole} tried to access ${req.originalUrl}`);
      
      return res.status(403).json({
        success: false,
        message: `User role ${userRole} is not authorized to access this route`,
        required: roles
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.status !== 'suspended') {
      req.user = user;
      req.userId = user.id;
    }
    
    next();
  } catch (error) {
    // Just continue without user
    next();
  }
};

// Blacklist token (logout)
exports.blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Auto-remove after expiry (cleanup)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 30 * 24 * 60 * 60 * 1000); // 30 days
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const userRole = req.user.role || req.user.userType;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

// Check if user owns the resource or is admin
exports.isOwnerOrAdmin = (getUserIdFromReq) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role || req.user.userType;
    const resourceUserId = getUserIdFromReq(req);

    if (userRole === 'admin' || req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You don't have permission to access this resource",
    });
  };
};