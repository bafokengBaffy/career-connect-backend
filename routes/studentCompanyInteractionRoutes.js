// @ts-nocheck
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  createInteraction,
  getRelationshipInteractions,
  getInteractionById,
  updateInteraction,
  deleteInteraction,
  markAsRead,
  getUpcomingInteractions,
  completeInteraction,
  getTimeline,
  getCommunicationPatterns
} = require('../controllers/studentCompanyInteractionController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const interactionValidation = [
  body('relationshipId').isMongoId().withMessage('Valid relationship ID is required'),
  body('type').isIn([
    'message', 'email', 'call', 'meeting', 'interview',
    'task', 'submission', 'review', 'feedback', 'document_share',
    'offer', 'acceptance', 'rejection', 'scheduling',
    'introduction', 'follow_up', 'reminder', 'note'
  ]).withMessage('Valid interaction type is required'),
  body('content.text').optional().isString(),
  body('content.attachments').optional().isArray(),
  body('scheduledFor').optional().isISO8601().toDate(),
  body('metadata').optional().isObject()
];

const statusValidation = [
  body('status').isIn(['scheduled', 'completed', 'cancelled', 'pending', 'failed'])
    .withMessage('Valid status is required')
];

// Routes
router.route('/')
  .post(protect, interactionValidation, validate, createInteraction);

router.route('/upcoming')
  .get(protect, [
    query('days').optional().isInt({ min: 1, max: 30 })
  ], validate, getUpcomingInteractions);

router.route('/relationship/:relationshipId')
  .get(protect, [
    param('relationshipId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isString(),
    query('before').optional().isISO8601()
  ], validate, getRelationshipInteractions);

router.route('/timeline/:relationshipId')
  .get(protect, [
    param('relationshipId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ], validate, getTimeline);

router.route('/patterns/:relationshipId')
  .get(protect, [
    param('relationshipId').isMongoId()
  ], validate, getCommunicationPatterns);

router.route('/:id')
  .get(protect, [
    param('id').isMongoId()
  ], validate, getInteractionById)
  .put(protect, [
    param('id').isMongoId()
  ], validate, updateInteraction)
  .delete(protect, [
    param('id').isMongoId()
  ], validate, deleteInteraction);

router.route('/:id/read')
  .patch(protect, [
    param('id').isMongoId()
  ], validate, markAsRead);

router.route('/:id/complete')
  .patch(protect, [
    param('id').isMongoId(),
    body('metadata').optional().isObject()
  ], validate, completeInteraction);

module.exports = router;