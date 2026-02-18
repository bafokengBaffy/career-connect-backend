// @ts-nocheck
// backend/models/User.js

// IMPORTANT: If you have an isFeatured property in your user data,
// make sure there's no method named isFeatured in this class
// The warning indicates a naming conflict

// If you find a method named isFeatured, rename it to something like:
// - checkIsFeatured()
// - getFeaturedStatus()
// - isUserFeatured()
// @ts-nocheck
// backend/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// ======================
// User Routes
// ======================

// Profile routes (self)
router.get('/profile', userController.getCurrentUser);
router.put('/profile', userController.updateCurrentUser);
router.put('/change-password', userController.changePassword);

// Statistics (admin only)
router.get('/statistics', authorizeRole('admin'), userController.getUserStatistics);

// User activity (admin only)
router.get('/:id/activity', authorizeRole('admin'), userController.getUserActivity);

// User management routes (with ID parameter)
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser); // Self or admin
router.delete('/:id', authorizeRole('admin'), userController.deleteUser);
router.put('/:id/toggle-status', authorizeRole('admin'), userController.toggleUserStatus);
router.put('/:id/verify', authorizeRole('admin'), userController.verifyUser);
router.put('/:id/change-password', userController.changeUserPassword); // Self or admin

// List users route (admin only) - MUST BE LAST to prevent conflicts with /:id
router.get('/', authorizeRole('admin'), userController.getUsers);

module.exports = router;