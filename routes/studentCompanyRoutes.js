// @ts-nocheck
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  createRelationship,
  getAllRelationships,
  getRelationshipById,
  updateRelationship,
  deleteRelationship,
  getStudentRelationships,
  getCompanyRelationships,
  updateStatus,
  getAnalytics
} = require('../controllers/studentCompanyController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const relationshipValidation = [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('companyId').isMongoId().withMessage('Valid company ID is required'),
  body('relationshipType').isIn(['internship', 'job', 'project', 'mentorship', 'collaboration', 'research'])
    .withMessage('Valid relationship type is required'),
  body('collaborationDetails.workType').optional().isIn(['remote', 'hybrid', 'onsite']),
  body('collaborationDetails.hoursPerWeek').optional().isInt({ min: 1, max: 168 })
];

const statusValidation = [
  body('status').isIn(['pending', 'active', 'completed', 'terminated', 'on_hold'])
    .withMessage('Valid status is required')
];

// Routes
router.route('/')
  .post(protect, relationshipValidation, validate, createRelationship)
  .get(protect, authorize('admin'), getAllRelationships);

router.route('/analytics/dashboard')
  .get(protect, authorize('admin'), getAnalytics);

router.route('/student/:studentId')
  .get(protect, [
    param('studentId').isMongoId()
  ], validate, getStudentRelationships);

router.route('/company/:companyId')
  .get(protect, [
    param('companyId').isMongoId()
  ], validate, getCompanyRelationships);

router.route('/:id')
  .get(protect, [
    param('id').isMongoId()
  ], validate, getRelationshipById)
  .put(protect, [
    param('id').isMongoId()
  ], validate, updateRelationship)
  .delete(protect, authorize('admin'), [
    param('id').isMongoId()
  ], validate, deleteRelationship);

router.route('/:id/status')
  .patch(protect, [
    param('id').isMongoId(),
    ...statusValidation
  ], validate, updateStatus);

module.exports = router;