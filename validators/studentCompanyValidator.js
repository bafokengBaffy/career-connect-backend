const { body, param, query } = require('express-validator');

exports.validateRelationship = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),
  
  body('companyId')
    .notEmpty().withMessage('Company ID is required')
    .isMongoId().withMessage('Invalid company ID format'),
  
  body('relationshipType')
    .notEmpty().withMessage('Relationship type is required')
    .isIn(['internship', 'job', 'project', 'mentorship', 'collaboration', 'research'])
    .withMessage('Invalid relationship type'),
  
  body('collaborationDetails.startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format')
    .toDate(),
  
  body('collaborationDetails.endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .toDate()
    .custom((endDate, { req }) => {
      if (req.body.collaborationDetails?.startDate && endDate) {
        if (new Date(endDate) <= new Date(req.body.collaborationDetails.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  body('collaborationDetails.workType')
    .optional()
    .isIn(['remote', 'hybrid', 'onsite'])
    .withMessage('Invalid work type'),
  
  body('collaborationDetails.hoursPerWeek')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Hours per week must be between 1 and 168'),
  
  body('collaborationDetails.compensation.type')
    .optional()
    .isIn(['paid', 'volunteer', 'credit', 'equity'])
    .withMessage('Invalid compensation type'),
  
  body('collaborationDetails.compensation.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compensation amount must be positive'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

exports.validateStatusUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid relationship ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'active', 'completed', 'terminated', 'on_hold'])
    .withMessage('Invalid status')
];

exports.validateRelationshipId = [
  param('id')
    .isMongoId().withMessage('Invalid relationship ID')
];

exports.validateStudentId = [
  param('studentId')
    .isMongoId().withMessage('Invalid student ID')
];

exports.validateCompanyId = [
  param('companyId')
    .isMongoId().withMessage('Invalid company ID')
];

exports.validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('status')
    .optional()
    .isIn(['pending', 'active', 'completed', 'terminated', 'on_hold'])
    .withMessage('Invalid status filter'),
  
  query('relationshipType')
    .optional()
    .isIn(['internship', 'job', 'project', 'mentorship', 'collaboration', 'research'])
    .withMessage('Invalid relationship type filter')
];