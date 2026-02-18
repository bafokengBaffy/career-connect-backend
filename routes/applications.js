// @ts-nocheck
// backend/routes/applications.js
const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get applications (with filtering) - FIXED: using correct controller method names
router.get('/', applicationController.getApplications); // Changed from getAllApplications
router.get('/stats', applicationController.getApplicationStatistics);
router.get('/job/:jobId', applicationController.getJobApplications);
router.get('/student/:studentId', authorizeRole('student'), applicationController.getStudentApplications);
router.get('/company/:companyId', authorizeRole('company', 'admin'), applicationController.getCompanyApplications);
router.get('/:id', applicationController.getApplicationById);

// Create application
router.post('/', authorizeRole('student'), applicationController.createApplication);

// Update application status
router.put('/:id/status', authorizeRole('company', 'admin'), applicationController.updateApplicationStatus);
router.put('/:id/withdraw', authorizeRole('student'), applicationController.withdrawApplication);

// Notes and feedback
router.post('/:id/notes', authorizeRole('company', 'admin'), applicationController.addNote);
router.post('/:id/feedback', authorizeRole('company', 'admin'), applicationController.addFeedback);

// Delete application (admin only)
router.delete('/:id', authorizeRole('admin'), applicationController.deleteApplication);

module.exports = router;