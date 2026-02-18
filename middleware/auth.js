// backend/middleware/auth.js
// @ts-nocheck
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../config/firebase");

// SECURITY: Validate JWT secret
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not defined in environment variables');
    process.exit(1);
  }
  
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    console.error('Current length:', process.env.JWT_SECRET.length);
    process.exit(1);
  }
};
validateJWTSecret();

// Blacklisted tokens (implement with Redis in production)
class TokenBlacklist {
  constructor() {
    this.tokens = new Map();
  }

  add(token, expiresIn = 30 * 24 * 60 * 60 * 1000) {
    const expiry = Date.now() + expiresIn;
    this.tokens.set(token, expiry);
    
    // Auto-remove after expiry
    setTimeout(() => {
      this.tokens.delete(token);
    }, expiresIn);
  }

  has(token) {
    const expiry = this.tokens.get(token);
    if (!expiry) return false;
    
    if (Date.now() > expiry) {
      this.tokens.delete(token);
      return false;
    }
    
    return true;
  }

  remove(token) {
    this.tokens.delete(token);
  }

  clear() {
    this.tokens.clear();
  }

  get size() {
    return this.tokens.size;
  }

  getAll() {
    return Array.from(this.tokens.entries());
  }
}

const tokenBlacklist = new TokenBlacklist();

// Extract token from request
const extractToken = (req) => {
  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  
  // Check cookie if no header (for web apps)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check query parameter (for WebSocket or special cases)
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

// Protect routes
const protect = async (req, res, next) => {
  const token = extractToken(req);

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
      algorithms: ['HS256']
    });

    // Get user from the token
    const user = await User.findById(decoded.id).select('-password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Check if user is active
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Account is suspended. Please contact support.",
      });
    }

    if (user.status === 'deleted' || user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "This account has been deleted",
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role || user.userType;
    req.token = token;

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
const authorize = (...roles) => {
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
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    // Skip if blacklisted
    if (tokenBlacklist.has(token)) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.status !== 'suspended' && user.status !== 'deleted') {
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role || user.userType;
    }
    
    next();
  } catch (error) {
    // Just continue without user
    next();
  }
};

// Blacklist token (logout)
const blacklistToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
    console.log('Token blacklisted for logout');
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
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

// Check if user is company
const isCompany = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const userRole = req.user.role || req.user.userType;
  
  if (userRole !== 'company') {
    return res.status(403).json({
      success: false,
      message: "Company access required",
    });
  }

  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const userRole = req.user.role || req.user.userType;
  
  if (userRole !== 'student') {
    return res.status(403).json({
      success: false,
      message: "Student access required",
    });
  }

  next();
};

// Check if user owns the resource or is admin
const isOwnerOrAdmin = (getUserIdFromReq) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role || req.user.userType;
    
    // Admin always has access
    if (userRole === 'admin') {
      return next();
    }

    // Check if user owns the resource
    try {
      const resourceUserId = getUserIdFromReq(req);
      
      if (req.user.id === resourceUserId || req.user._id.toString() === resourceUserId) {
        return next();
      }
    } catch (error) {
      console.error('Error extracting resource userId:', error);
    }

    return res.status(403).json({
      success: false,
      message: "You don't have permission to access this resource",
    });
  };
};

// Check if user is owner or company admin
const isOwnerOrCompanyAdmin = (getCompanyIdFromReq) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role || req.user.userType;
    
    // Admin always has access
    if (userRole === 'admin') {
      return next();
    }

    // Company owners have access
    if (userRole === 'company') {
      try {
        const companyId = getCompanyIdFromReq(req);
        
        // Check if user owns this company
        if (req.user.companyId && req.user.companyId.toString() === companyId) {
          return next();
        }
      } catch (error) {
        console.error('Error extracting companyId:', error);
      }
    }

    return res.status(403).json({
      success: false,
      message: "You don't have permission to access this company resource",
    });
  };
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id || user.id,
      email: user.email,
      role: user.role || user.userType
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
      algorithm: 'HS256'
    }
  );
};

// Verify token (utility function)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
  } catch (error) {
    return null;
  }
};

// Verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Find or create user in MongoDB
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      // Create new user from Firebase data
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        firstName: decodedToken.name ? decodedToken.name.split(' ')[0] : '',
        lastName: decodedToken.name ? decodedToken.name.split(' ').slice(1).join(' ') : '',
        profilePicture: decodedToken.picture,
        isVerified: decodedToken.email_verified,
        authProvider: 'firebase',
        role: 'student' // Default role
      });
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = user.role || user.userType;
    req.firebaseUser = decodedToken;

    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({
      success: false,
      message: "Invalid Firebase token",
    });
  }
};

// Get blacklist stats
const getBlacklistStats = (req, res) => {
  return res.json({
    success: true,
    data: {
      blacklistedTokens: tokenBlacklist.size,
      tokens: tokenBlacklist.getAll()
    }
  });
};

// Clear blacklist
const clearBlacklist = (req, res) => {
  tokenBlacklist.clear();
  console.log('Token blacklist cleared by admin');
  
  return res.json({
    success: true,
    message: "Token blacklist cleared successfully"
  });
};

// Export all functions individually
exports.protect = protect;
exports.authenticateToken = protect; // Alias for protect
exports.optionalAuth = optionalAuth;
exports.authorize = authorize;
exports.authorizeRole = authorize; // Alias for authorize
exports.isAdmin = isAdmin;
exports.isCompany = isCompany;
exports.isStudent = isStudent;
exports.isOwnerOrAdmin = isOwnerOrAdmin;
exports.isOwnerOrCompanyAdmin = isOwnerOrCompanyAdmin;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.blacklistToken = blacklistToken;
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.getBlacklistStats = getBlacklistStats;
exports.clearBlacklist = clearBlacklist;
exports.tokenBlacklist = tokenBlacklist;

// Also export as module.exports for CommonJS compatibility
module.exports = {
  protect,
  authenticateToken: protect,
  optionalAuth,
  authorize,
  authorizeRole: authorize,
  isAdmin,
  isCompany,
  isStudent,
  isOwnerOrAdmin,
  isOwnerOrCompanyAdmin,
  generateToken,
  verifyToken,
  blacklistToken,
  verifyFirebaseToken,
  getBlacklistStats,
  clearBlacklist,
  tokenBlacklist
};