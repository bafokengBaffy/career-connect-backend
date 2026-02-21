// @ts-nocheck
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  getStudentMatches,
  getCompanyMatches,
  getMatchById,
  updateMatchStatus,
  getMatchBreakdown,
  getMatchStats,
  getRecommendations,
  batchGenerateMatches,
  getMatchQuality
} = require('../controllers/studentCompanyMatchingController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const statusValidation = [
  body('status').isIn(['pending', 'viewed', 'shortlisted', 'contacted', 'rejected', 'accepted'])
    .withMessage('Valid status is required'),
  body('metadata').optional().isObject()
];

const recommendationsValidation = [
  body('studentId').optional().isMongoId(),
  body('companyId').optional().isMongoId(),
  body('criteria').optional().isObject()
];

const batchValidation = [
  body('companyIds').optional().isArray(),
  body('studentIds').optional().isArray(),
  body('type').optional().isString()
];

// Routes
router.route('/student/:studentId')
  .get(protect, [
    param('studentId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('minScore').optional().isInt({ min: 0, max: 100 }),
    query('refresh').optional().isBoolean()
  ], validate, getStudentMatches);

router.route('/company/:companyId')
  .get(protect, [
    param('companyId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('minScore').optional().isInt({ min: 0, max: 100 }),
    query('jobId').optional().isMongoId(),
    query('internshipId').optional().isMongoId(),
    query('refresh').optional().isBoolean()
  ], validate, getCompanyMatches);

router.route('/stats')
  .get(protect, authorize('admin'), getMatchStats);

router.route('/recommendations')
  .post(protect, recommendationsValidation, validate, getRecommendations);

router.route('/batch')
  .post(protect, authorize('admin'), batchValidation, validate, batchGenerateMatches);

router.route('/:id')
  .get(protect, [
    param('id').isMongoId()
  ], validate, getMatchById);

router.route('/:id/status')
  .patch(protect, [
    param('id').isMongoId(),
    ...statusValidation
  ], validate, updateMatchStatus);

router.route('/:id/breakdown')
  .get(protect, [
    param('id').isMongoId()
  ], validate, getMatchBreakdown);

router.route('/:id/quality')
  .get(protect, [
    param('id').isMongoId()
  ], validate, getMatchQuality);

module.exports = router;