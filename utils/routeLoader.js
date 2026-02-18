// utils/routeLoader.js
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Secure route loader with validation
 */
const loadSecureRoutes = () => {
  logger.info("🔄 Loading and validating routes with security checks...");
  
  const routes = {};
  const routeFiles = [
    { name: 'auth', path: './routes/auth', required: true },
    { name: 'upload', path: './routes/uploadRoutes', required: true },
    { name: 'institutions', path: './routes/institutions', required: false },
    { name: 'courses', path: './routes/courses', required: false },
    { name: 'companies', path: './routes/companies', required: false },
    { name: 'students', path: './routes/studentRoutes', required: false },
    { name: 'analytics', path: './routes/analytics', required: false },
    { name: 'users', path: './routes/users', required: false },
    { name: 'jobs', path: './routes/jobs', required: false },
    { name: 'applications', path: './routes/applications', required: false },
    { name: 'messages', path: './routes/messages', required: false },
    { name: 'notifications', path: './routes/notifications', required: false }
  ];
  
  routeFiles.forEach(route => {
    try {
      const routePath = route.path.startsWith('.') ? route.path : `./routes/${route.path}`;
      const fullPath = path.join(__dirname, '..', routePath + '.js');
      
      // Check if route file exists before requiring
      if (!fs.existsSync(fullPath)) {
        if (route.required) {
          throw new Error(`Required route file not found: ${routePath}.js`);
        }
        logger.warn(`⚠️ Route file not found: ${route.name} (${fullPath})`);
        routes[route.name] = null;
        return;
      }
      
      const routeModule = require(fullPath);
      
      // Validate route module has expected structure
      if (typeof routeModule !== 'function' && typeof routeModule !== 'object') {
        throw new Error(`Invalid route module: ${route.name}`);
      }
      
      // Check if it's an Express router (has use, get, post methods)
      if (routeModule && typeof routeModule === 'object') {
        const hasRouterMethods = ['use', 'get', 'post', 'put', 'delete'].some(
          method => typeof routeModule[method] === 'function'
        );
        
        if (!hasRouterMethods) {
          logger.warn(`⚠️ ${route.name}Routes: Loaded but may not be a valid Express router`);
        }
      }
      
      routes[route.name] = routeModule;
      logger.info(`✅ ${route.name}Routes: Loaded and validated`);
      
    } catch (error) {
      if (route.required) {
        logger.error(`❌ ${route.name}Routes: Critical failure - ${error.message}`);
        process.exit(1);
      } else {
        logger.warn(`⚠️ ${route.name}Routes: ${error.message}`);
        routes[route.name] = null;
      }
    }
  });
  
  return routes;
};

module.exports = loadSecureRoutes;