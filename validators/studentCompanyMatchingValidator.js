const { body, param, query } = require('express-validator');

exports.validateMatchStatus = [
  param('id')
    .isMongoId().withMessage('Invalid match ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'viewed', 'shortlisted', 'contacted', 'rejected', 'accepted'])
    .withMessage('Invalid status'),
  
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object')
];

exports.validateStudentMatches = [
  param('studentId')
    .isMongoId().withMessage('Invalid student ID'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('minScore')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Minimum score must be between 0 and 100')
    .toInt(),
  
  query('type')
    .optional()
    .isIn(['all', 'jobs', 'internships', 'projects'])
    .withMessage('Invalid match type'),
  
  query('refresh')
    .optional()
    .isBoolean().withMessage('Refresh must be a boolean')
    .toBoolean()
];

exports.validateCompanyMatches = [
  param('companyId')
    .isMongoId().withMessage('Invalid company ID'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('minScore')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Minimum score must be between 0 and 100')
    .toInt(),
  
  query('jobId')
    .optional()
    .isMongoId().withMessage('Invalid job ID'),
  
  query('internshipId')
    .optional()
    .isMongoId().withMessage('Invalid internship ID'),
  
  query('refresh')
    .optional()
    .isBoolean().withMessage('Refresh must be a boolean')
    .toBoolean()
];

exports.validateRecommendations = [
  body('studentId')
    .optional()
    .isMongoId().withMessage('Invalid student ID'),
  
  body('companyId')
    .optional()
    .isMongoId().withMessage('Invalid company ID')
    .custom((value, { req }) => {
      if (!value && !req.body.studentId) {
        throw new Error('Either studentId or companyId is required');
      }
      return true;
    }),
  
  body('criteria')
    .optional()
    .isObject().withMessage('Criteria must be an object'),
  
  body('criteria.limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  
  body('criteria.industries')
    .optional()
    .isArray().withMessage('Industries must be an array'),
  
  body('criteria.skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
];

exports.validateBatchMatch = [
  body('companyIds')
    .optional()
    .isArray().withMessage('Company IDs must be an array')
    .custom((ids) => {
      if (ids && !ids.every((/** @type {string} */ id) => /^[0-9a-fA-F]{24}$/.test(id))) {
        throw new Error('Invalid company ID format');
      }
      return true;
    }),
  
  body('studentIds')
    .optional()
    .isArray().withMessage('Student IDs must be an array')
    .custom((ids) => {
      if (ids && !ids.every((/** @type {string} */ id) => /^[0-9a-fA-F]{24}$/.test(id))) {
        throw new Error('Invalid student ID format');
      }
      return true;
    }),
  
  body('type')
    .optional()
    .isString().withMessage('Type must be a string')
];

exports.validateMatchId = [
  param('id')
    .isMongoId().withMessage('Invalid match ID')
];