// backend/routes/analytics.js
// @ts-nocheck
/**
 * Career Connect Lesotho - Analytics Routes
 * Enterprise-grade analytics endpoints with security, caching, and comprehensive metrics
 * Security Level: Enterprise
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const winston = require('winston');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// ======================
// LOGGING CONFIGURATION
// ======================
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/analytics.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ======================
// CACHE CONFIGURATION
// ======================
const analyticsCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60,
  useClones: false,
  maxKeys: 1000
});

// ======================
// VALIDATION RULES
// ======================
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

const entityValidation = [
  param('entityId')
    .isMongoId()
    .withMessage('Invalid entity ID format')
];

// ======================
// RATE LIMITERS
// ======================
const analyticsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const detailedAnalyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Stricter limit for detailed analytics
  message: {
    success: false,
    error: 'Detailed analytics rate limit exceeded'
  }
});

// ======================
// CACHE MIDDLEWARE
// ======================
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    const key = `analytics_${req.originalUrl || req.url}`;
    const cachedResponse = analyticsCache.get(key);
    
    if (cachedResponse) {
      logger.debug('Cache hit', { key });
      return res.json({
        ...cachedResponse,
        cached: true,
        cachedAt: new Date().toISOString()
      });
    }
    
    // Store original send function
    const originalSend = res.json;
    
    // Override send function to cache response
    res.json = function(body) {
      if (res.statusCode === 200) {
        analyticsCache.set(key, body, duration);
      }
      originalSend.call(this, body);
    };
    
    next();
  };
};

// ======================
// UTILITY FUNCTIONS
// ======================
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      errors: errors.array()
    });
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const getDateRange = (req) => {
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate 
    ? new Date(req.query.startDate) 
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
  
  return { startDate, endDate };
};

// ======================
// ANALYTICS CONTROLLER FUNCTIONS
// ======================

/**
 * Get overview analytics
 */
const getOverview = async (req, res, next) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const entityType = req.query.type || 'all';
    
    logger.info('Fetching overview analytics', {
      startDate,
      endDate,
      entityType,
      userId: req.user?.id
    });
    
    // In production, replace with actual database queries
    const overview = {
      totalUsers: Math.floor(Math.random() * 10000) + 5000,
      activeUsers: Math.floor(Math.random() * 5000) + 1000,
      newUsers: Math.floor(Math.random() * 500) + 50,
      totalCompanies: Math.floor(Math.random() * 500) + 200,
      totalJobs: Math.floor(Math.random() * 1000) + 500,
      applications: Math.floor(Math.random() * 5000) + 1000,
      conversionRate: (Math.random() * 30 + 10).toFixed(2),
      averageSessionTime: Math.floor(Math.random() * 600) + 120,
      bounceRate: (Math.random() * 40 + 20).toFixed(2)
    };
    
    res.json({
      success: true,
      data: {
        overview,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        entityType
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        cached: false
      }
    });
  } catch (error) {
    logger.error('Error fetching overview analytics', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get trend analytics
 */
const getTrends = async (req, res, next) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const interval = req.query.interval || 'day';
    const metrics = req.query.metrics || ['users', 'applications', 'companies'];
    
    logger.info('Fetching trend analytics', {
      startDate,
      endDate,
      interval,
      metrics
    });
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      trends.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 1000) + 100,
        pageViews: Math.floor(Math.random() * 5000) + 500,
        applications: Math.floor(Math.random() * 100) + 10,
        companies: Math.floor(Math.random() * 20) + 5
      });
    }
    
    res.json({
      success: true,
      data: {
        trends,
        interval,
        metrics: Array.isArray(metrics) ? metrics : [metrics],
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: trends.length
      }
    });
  } catch (error) {
    logger.error('Error fetching trend analytics', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get demographics analytics
 */
const getDemographics = async (req, res, next) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    
    logger.info('Fetching demographics analytics', {
      startDate,
      endDate,
      userId: req.user?.id
    });
    
    const demographics = {
      ageGroups: {
        '18-24': Math.floor(Math.random() * 3000) + 1000,
        '25-34': Math.floor(Math.random() * 4000) + 2000,
        '35-44': Math.floor(Math.random() * 2000) + 500,
        '45-54': Math.floor(Math.random() * 1000) + 200,
        '55+': Math.floor(Math.random() * 500) + 100
      },
      locations: {
        'Maseru': Math.floor(Math.random() * 3000) + 1000,
        'Leribe': Math.floor(Math.random() * 1500) + 500,
        'Mafeteng': Math.floor(Math.random() * 1000) + 300,
        'Mohales Hoek': Math.floor(Math.random() * 800) + 200,
        'Other': Math.floor(Math.random() * 1000) + 500
      },
      education: {
        'High School': Math.floor(Math.random() * 2000) + 500,
        'Diploma': Math.floor(Math.random() * 3000) + 1000,
        'Bachelor': Math.floor(Math.random() * 4000) + 2000,
        'Master': Math.floor(Math.random() * 1000) + 300,
        'PhD': Math.floor(Math.random() * 200) + 50
      }
    };
    
    res.json({
      success: true,
      data: {
        demographics,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalUsers: Object.values(demographics.ageGroups).reduce((a, b) => a + b, 0)
      }
    });
  } catch (error) {
    logger.error('Error fetching demographics analytics', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get performance metrics
 */
const getPerformance = async (req, res, next) => {
  try {
    logger.info('Fetching performance metrics', {
      userId: req.user?.id
    });
    
    const performance = {
      responseTime: {
        avg: (Math.random() * 200 + 50).toFixed(0),
        p95: (Math.random() * 500 + 100).toFixed(0),
        p99: (Math.random() * 1000 + 200).toFixed(0)
      },
      errorRate: (Math.random() * 2).toFixed(2),
      uptime: 99.9,
      requestsPerSecond: Math.floor(Math.random() * 100) + 20,
      activeConnections: Math.floor(Math.random() * 50) + 10,
      databaseLatency: (Math.random() * 50 + 5).toFixed(0),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        pid: process.pid
      }
    };
    
    res.json({
      success: true,
      data: performance,
      metadata: {
        generatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    logger.error('Error fetching performance metrics', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get company analytics
 */
const getCompanyAnalytics = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = getDateRange(req);
    
    // Check authorization (user must own company or be admin)
    if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
      logger.warn('Unauthorized company analytics access', {
        userId: req.user?.id,
        companyId,
        requestedCompanyId: companyId
      });
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this company\'s analytics'
      });
    }
    
    logger.info('Fetching company analytics', {
      companyId,
      startDate,
      endDate,
      userId: req.user?.id
    });
    
    // Generate company-specific data
    const companyAnalytics = {
      profileViews: Math.floor(Math.random() * 1000) + 100,
      jobPostViews: Math.floor(Math.random() * 500) + 50,
      applicationsReceived: Math.floor(Math.random() * 200) + 20,
      averageApplicantRating: (Math.random() * 3 + 2).toFixed(1),
      topPerformingJobs: Array(5).fill(null).map((_, i) => ({
        jobId: `job_${i + 1}`,
        title: `Software Developer ${i + 1}`,
        applications: Math.floor(Math.random() * 50) + 5,
        views: Math.floor(Math.random() * 200) + 20
      })),
      dailyStats: Array(30).fill(null).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50) + 5,
          applications: Math.floor(Math.random() * 10) + 1
        };
      })
    };
    
    res.json({
      success: true,
      data: {
        companyId,
        analytics: companyAnalytics,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      },
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching company analytics', {
      error: error.message,
      stack: error.stack,
      companyId: req.params.companyId
    });
    next(error);
  }
};

/**
 * Export analytics data
 */
const exportAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = getDateRange(req);
    const format = req.query.format;
    const type = req.query.type;
    
    logger.info('Exporting analytics data', {
      format,
      type,
      startDate,
      endDate,
      userId: req.user?.id
    });
    
    // Collect all requested data
    let exportData = {};
    
    if (type === 'all' || type === 'overview') {
      exportData.overview = {
        totalUsers: Math.floor(Math.random() * 10000) + 5000,
        activeUsers: Math.floor(Math.random() * 5000) + 1000,
        newUsers: Math.floor(Math.random() * 500) + 50
      };
    }
    if (type === 'all' || type === 'trends') {
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      exportData.trends = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        exportData.trends.push({
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 1000) + 100
        });
      }
    }
    if (type === 'all' || type === 'demographics') {
      exportData.demographics = {
        ageGroups: { '18-24': 2000, '25-34': 3000, '35-44': 1500 }
      };
    }
    
    if (format === 'json') {
      res.json({
        success: true,
        data: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          type,
          period: { startDate, endDate }
        }
      });
    } else {
      // For CSV format, set appropriate headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${Date.now()}.csv`);
      
      // Convert to CSV
      let csv = 'Metric,Value\n';
      const flattenData = (obj, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object') {
            flattenData(value, `${prefix}${key}.`);
          } else {
            csv += `${prefix}${key},${value}\n`;
          }
        }
      };
      flattenData(exportData);
      
      res.send(csv);
    }
  } catch (error) {
    logger.error('Error exporting analytics data', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Health check
 */
const healthCheck = (req, res) => {
  res.json({
    success: true,
    service: 'analytics',
    status: 'operational',
    cache: {
      size: analyticsCache.keys().length,
      maxKeys: analyticsCache.options.maxKeys,
      ttl: analyticsCache.options.stdTTL
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Clear cache
 */
const clearCache = (req, res, next) => {
  try {
    const keys = analyticsCache.keys();
    analyticsCache.flushAll();
    
    logger.info('Analytics cache cleared', {
      keysCleared: keys.length,
      userId: req.user?.id
    });
    
    res.json({
      success: true,
      message: 'Analytics cache cleared successfully',
      keysCleared: keys.length
    });
  } catch (error) {
    logger.error('Error clearing analytics cache', {
      error: error.message
    });
    next(error);
  }
};

// ======================
// ROUTES
// ======================

router.get('/overview', authenticateToken, analyticsRateLimiter, dateRangeValidation, validateRequest, cacheMiddleware(300), getOverview);
router.get('/trends', authenticateToken, analyticsRateLimiter, dateRangeValidation, validateRequest, cacheMiddleware(600), getTrends);
router.get('/demographics', authenticateToken, authorizeRole('admin'), detailedAnalyticsLimiter, dateRangeValidation, validateRequest, cacheMiddleware(3600), getDemographics);
router.get('/performance', authenticateToken, authorizeRole('admin'), detailedAnalyticsLimiter, cacheMiddleware(60), getPerformance);
router.get('/company/:companyId', authenticateToken, detailedAnalyticsLimiter, param('companyId').isMongoId(), dateRangeValidation, validateRequest, cacheMiddleware(300), getCompanyAnalytics);
router.get('/export', authenticateToken, authorizeRole('admin'), detailedAnalyticsLimiter, dateRangeValidation, validateRequest, exportAnalytics);
router.get('/health', healthCheck);
router.delete('/cache', authenticateToken, authorizeRole('admin'), clearCache);

// ======================
// ERROR HANDLING FOR THIS ROUTER
// ======================
router.use((error, req, res, next) => {
  logger.error('Analytics route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    path: req.path
  });
});

module.exports = router;