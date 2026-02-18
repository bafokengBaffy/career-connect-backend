// utils/envValidator.js
const logger = require('./logger');

/**
 * Environment validation utility
 */
const validateEnvironment = () => {
  console.log("🔐 [ENV VALIDATION] Checking environment configuration...");

  const REQUIRED_ENV_VARS = [
    'NODE_ENV', 
    'PORT',
    'SESSION_SECRET',
    'JWT_SECRET',
    'CORS_ORIGIN'
  ];

  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    logger.error('Missing required environment variables', { missingVars });
    process.exit(1);
  }

  // Validate secrets strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    console.error('❌ SESSION_SECRET must be at least 32 characters');
    logger.error('SESSION_SECRET too weak');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters');
    logger.error('JWT_SECRET too weak');
    process.exit(1);
  }

  console.log("✅ Environment validation passed");
  logger.info("Environment validation passed");
  
  return true;
};

module.exports = validateEnvironment;