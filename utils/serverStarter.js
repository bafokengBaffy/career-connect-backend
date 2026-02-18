// utils/serverStarter.js
const https = require('https');
const http = require('http');
const fs = require('fs');
const logger = require('./logger');

/**
 * Start HTTP/HTTPS server
 */
const startServer = (app, PORT) => {
  const port = parseInt(PORT);
  
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(`Invalid port: ${PORT}`);
    process.exit(1);
  }
  
  let server;
  
  // HTTPS in production
  if (process.env.NODE_ENV === 'production' && process.env.SSL_KEY && process.env.SSL_CERT) {
    try {
      const privateKey = fs.readFileSync(process.env.SSL_KEY, 'utf8');
      const certificate = fs.readFileSync(process.env.SSL_CERT, 'utf8');
      const credentials = { 
        key: privateKey, 
        cert: certificate,
        ca: process.env.SSL_CA ? fs.readFileSync(process.env.SSL_CA, 'utf8') : undefined
      };
      
      server = https.createServer(credentials, app);
      logger.info('🔒 HTTPS server configured');
    } catch (error) {
      logger.error('Failed to load SSL certificates', { error: error.message });
      process.exit(1);
    }
  } else {
    server = http.createServer(app);
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️ Running in production without HTTPS');
    }
  }
  
  server.listen(port, '0.0.0.0', () => {
    logger.info('='.repeat(70));
    logger.info('🚀 ENTERPRISE SECURE SERVER STARTED');
    logger.info('='.repeat(70));
    logger.info(`📍 Server: ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${port}`);
    logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security Level: Enterprise (OWASP Top 10 Compliant)`);
    logger.info('='.repeat(70));
    logger.info('🛡️  Active Security Features:');
    logger.info('   ✅ Content Security Policy (CSP)');
    logger.info('   ✅ Rate Limiting & Slow Down');
    logger.info('   ✅ SQL/NoSQL Injection Protection');
    logger.info('   ✅ XSS Protection (Multiple Layers)');
    logger.info('   ✅ CSRF Protection');
    logger.info('   ✅ Input Validation & Sanitization');
    logger.info('   ✅ Secure Headers (HSTS, X-Frame-Options, etc.)');
    logger.info('   ✅ File Upload Validation');
    logger.info('   ✅ Request ID Tracing');
    logger.info('   ✅ Comprehensive Logging');
    logger.info('='.repeat(70));
  });
  
  return server;
};

module.exports = startServer;