// backend/routes/studentsRoutes.js
// @ts-nocheck
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get student data
router.get('/profile', studentController.getStudentProfile);
router.get('/applications', studentController.getStudentApplications);
router.get('/courses', studentController.getStudentCourses);
router.get('/documents', studentController.getStudentDocuments);
router.get('/jobs-applied', studentController.getJobsApplied);
router.get('/dashboard-stats', studentController.getDashboardStats);

// Update student data
router.put('/profile', studentController.updateStudentProfile);
router.post('/documents', studentController.uploadDocument);

// Additional student routes
router.get('/skills', studentController.getStudentSkills);
router.post('/skills', studentController.addSkill);
router.delete('/skills/:skillId', studentController.removeSkill);

router.get('/education', studentController.getEducation);
router.post('/education', studentController.addEducation);
router.put('/education/:eduId', studentController.updateEducation);
router.delete('/education/:eduId', studentController.deleteEducation);

router.get('/experience', studentController.getWorkExperience);
router.post('/experience', studentController.addWorkExperience);
router.put('/experience/:expId', studentController.updateWorkExperience);
router.delete('/experience/:expId', studentController.deleteWorkExperience);

module.exports = router;