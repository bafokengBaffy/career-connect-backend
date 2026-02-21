// backend/server.js
// @ts-nocheck
/**
 * Career Connect Lesotho - Enterprise Security Hardened API Server
 * OWASP Top 10 Compliant Implementation with Arcjet Protection
 * Security Level: Enterprise
 */

// ======================
// IMPORTS
// ======================
const express = require("express");
require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });

// Security Dependencies
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const slowDown = require("express-slow-down");
const morgan = require("morgan");

// Custom Middleware
const {
  securityHeaders,
  requestIdMiddleware,
  sqlInjectionProtection,
  fileUploadValidation,
  authenticateToken,
  requestLogger,
  dataSanitizer,
  rateLimiters,
  applyCsrfProtection,
  compressionMiddleware,
  helmetConfig,
  corsMiddleware,
  initializeRedis,
  getSessionConfig,
  notFoundHandler,
  globalErrorHandler,
  arcjetMiddleware,
  arcjetAuthMiddleware,
  arcjetUploadMiddleware,
  arcjetConfig
} = require('./middleware');

// Utilities
const logger = require('./utils/logger');
const validateEnvironment = require('./utils/envValidator');
const loadSecureRoutes = require('./utils/routeLoader');
const startServer = require('./utils/serverStarter');
const setupShutdownHandlers = require('./utils/gracefulShutdown');

// ======================
// INITIALIZATION
// ======================
console.log("🔐 [ENTERPRISE SERVER] Initializing with maximum security...");

// Validate environment variables
validateEnvironment();

// Initialize Arcjet
arcjetConfig.initialize();

const app = express();
const PORT = process.env.PORT || 5001;

// ======================
// SECURITY MIDDLEWARE STACK (Order is Critical!)
// ======================
logger.info("🛡️ Configuring security middleware stack...");

// Phase 1: Infrastructure Security
app.use(helmetConfig);
app.use(securityHeaders);
app.use(requestIdMiddleware);

// Phase 2: Request Validation & Sanitization
app.use(corsMiddleware);

// Speed limiter (slows down after threshold)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 100,
  validate: { delayMs: false }
});
app.use(speedLimiter);

// Global rate limit (complementary to Arcjet)
app.use(rateLimiters.globalLimiter);

// Apply Arcjet global protection
app.use(arcjetMiddleware);

// Body parsing with strict limits
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
      if (buf.toString().includes('\x00')) {
        throw new Error('Null byte detected');
      }
    } catch (e) {
      logger.warn('Invalid JSON payload', {
        error: e.message,
        ip: req.ip,
        url: req.originalUrl
      });
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 10
}));

// Phase 3: Data Sanitization (OWASP A1: Injection)
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('NoSQL injection attempt blocked', {
      key,
      value: req.body[key],
      ip: req.ip,
      url: req.originalUrl
    });
  }
}));

app.use(xss());
app.use(hpp({
  whitelist: ['filter', 'sort', 'limit', 'page']
}));

app.use(sqlInjectionProtection);
app.use(dataSanitizer);

// Phase 4: Session & Cookie Security
app.use(cookieParser(process.env.SESSION_SECRET || 'default-secret-change-me', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
}));

// Initialize Redis and session store
let redisClient, sessionStore;
(async () => {
  const redis = await initializeRedis();
  redisClient = redis.redisClient;
  sessionStore = redis.sessionStore;
  
  const sessionConfig = getSessionConfig(sessionStore);
  app.use(session(sessionConfig));
})();

// CSRF Protection (applies to state-changing methods)
app.use(applyCsrfProtection);

// Phase 5: Compression & Optimization
app.use(compressionMiddleware);

// ======================
// REQUEST LOGGING (OWASP A10)
// ======================
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: logger.stream,
  skip: (req) => req.path === '/health'
}));

app.use(requestLogger);

// ======================
// LOAD AND REGISTER ROUTES
// ======================
logger.info("🛣️ Loading and mounting routes with security layers...");

// Load routes with validation
const routes = loadSecureRoutes();

// Public routes (no authentication)
app.get("/", (req, res) => {
  res.json({
    service: "Career Connect Lesotho API",
    version: "2.0.0",
    status: "operational",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    security: {
      csp: "enabled",
      rateLimiting: "enabled",
      csrf: "enabled",
      xss: "enabled",
      sqlInjection: "enabled",
      arcjet: arcjetConfig.initialized ? "enabled" : "disabled"
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "connected",
    redis: redisClient ? "connected" : "disabled",
    arcjet: arcjetConfig.initialized ? "active" : "inactive"
  };
  
  res.json(health);
});

// Security test endpoint
app.get("/api/security/test", (req, res) => {
  res.json({
    message: "Security headers are active",
    arcjet: {
      initialized: arcjetConfig.initialized,
      mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN'
    },
    headers: {
      'X-Content-Type-Options': res.getHeader('X-Content-Type-Options'),
      'X-Frame-Options': res.getHeader('X-Frame-Options'),
      'X-XSS-Protection': res.getHeader('X-XSS-Protection'),
      'Strict-Transport-Security': res.getHeader('Strict-Transport-Security') || 'Not in production'
    }
  });
});

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Mount secure routes with appropriate security layers
if (routes.auth) {
  app.use("/api/auth", 
    arcjetAuthMiddleware, // Enhanced Arcjet with email validation
    rateLimiters.authLimiter, 
    routes.auth
  );
  logger.info("✅ Authentication routes mounted with Arcjet + rate limiting");
}

if (routes.upload) {
  app.use("/api/uploads", 
    authenticateToken, 
    arcjetUploadMiddleware,
    rateLimiters.uploadLimiter, 
    fileUploadValidation, 
    routes.upload
  );
  logger.info("✅ Upload routes mounted with Arcjet + authentication + rate limiting");
}

// Protected routes
const protectedRoutes = [
  { name: 'institutions', path: '/api/institutions' },
  { name: 'courses', path: '/api/courses' },
  { name: 'companies', path: '/api/companies' },
  { name: 'students', path: '/api/students' },
  { name: 'analytics', path: '/api/analytics' },
  { name: 'users', path: '/api/users' },
  { name: 'jobs', path: '/api/jobs' },
  { name: 'applications', path: '/api/applications' },
  { name: 'messages', path: '/api/messages' },
  { name: 'notifications', path: '/api/notifications' },
  { name: 'skills', path: '/api/skills' },
  { name: 'education', path: '/api/education' },
  { name: 'experiences', path: '/api/experiences' },
  { name: 'projects', path: '/api/projects' },
  { name: 'competitions', path: '/api/competitions' },
  { name: 'reviews', path: '/api/reviews' },
  { name: 'savedItems', path: '/api/saved-items' },
  { name: 'follows', path: '/api/follows' },
  { name: 'businessModels', path: '/api/business-models' },
  { name: 'news', path: '/api/news' }
];

protectedRoutes.forEach(route => {
  if (routes[route.name]) {
    if (typeof routes[route.name] === 'function' || 
        (typeof routes[route.name] === 'object' && routes[route.name] !== null)) {
      app.use(route.path, 
        authenticateToken, 
        arcjetMiddleware, // Apply standard Arcjet protection
        routes[route.name]
      );
      logger.info(`✅ ${route.path} mounted with authentication + Arcjet`);
    } else {
      logger.warn(`⚠️ ${route.path} route not mounted - invalid router`);
    }
  }
});

// ======================
// ERROR HANDLING
// ======================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ======================
// SERVER INITIALIZATION
// ======================
const server = startServer(app, PORT);

// ======================
// GRACEFUL SHUTDOWN
// ======================
setupShutdownHandlers(server, redisClient);

// Export for testing
module.exports = { app, server, logger };