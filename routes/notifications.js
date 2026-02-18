// @ts-nocheck
// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get notifications
router.get('/', notificationController.getNotifications);
router.get('/preferences', notificationController.getPreferences);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/:id', notificationController.getNotificationById);

// Update notifications
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/preferences', notificationController.updatePreferences);

// Delete notifications
router.delete('/:id', notificationController.deleteNotification);
router.delete('/clear-all', notificationController.clearAllNotifications);

module.exports = router;