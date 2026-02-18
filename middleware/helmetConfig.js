// middleware/helmetConfig.js
const helmet = require('helmet');

/**
 * Helmet security configuration
 * Implements various HTTP headers for security
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'sha256-ABC123...'", // For inline scripts (if absolutely necessary)
      "https://trusted-cdn.com",
      "https://cdn.jsdelivr.net"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Only if absolutely necessary
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "res.cloudinary.com",
      "https://*.cloudinary.com"
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    connectSrc: ["'self'", "https://api.trusted-service.com"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: process.env.CSP_REPORT_ONLY === 'true',
  setAllHeaders: false,
  disableAndroid: false,
  browserSniff: true
};

const helmetConfig = helmet({
  contentSecurityPolicy: cspConfig,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: false // We'll use our own XSS protection
});

module.exports = helmetConfig;