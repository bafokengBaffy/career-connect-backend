// @ts-nocheck
// backend/routes/jobs.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Public routes
router.get('/', jobController.getJobs); // Changed from getAll
router.get('/statistics', authorizeRole('admin'), jobController.getJobStatistics);
router.get('/:id', jobController.getJobById); // Changed from getOne
router.get('/:id/similar', jobController.getSimilarJobs);

// Protected routes
router.post('/', authenticateToken, authorizeRole('company'), jobController.createJob); // Changed from create
router.put('/:id', authenticateToken, jobController.updateJob); // Changed from update
router.delete('/:id', authenticateToken, jobController.deleteJob); // Changed from delete

// Additional routes
router.get('/:id/applications', authenticateToken, authorizeRole('company'), jobController.getJobApplications);
router.post('/:id/apply', authenticateToken, authorizeRole('student'), jobController.applyForJob);
router.post('/:id/save', authenticateToken, jobController.saveJob);
router.delete('/:id/save', authenticateToken, jobController.unsaveJob);

module.exports = router;