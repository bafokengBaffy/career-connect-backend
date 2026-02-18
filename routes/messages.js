// @ts-nocheck
// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get messages - FIXED: using correct controller method names
router.get('/', messageController.getMessages);
router.get('/conversations', messageController.getConversations);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:id', messageController.getMessageById);
router.get('/:id/thread', messageController.getConversationThread);

// Send messages
router.post('/', messageController.sendMessage);
router.post('/:id/reply', messageController.replyToMessage);

// Update messages
router.put('/:id/read', messageController.markAsRead);
router.put('/:id/archive', messageController.archiveMessage);

// Delete messages
router.delete('/:id', messageController.deleteMessage);

module.exports = router;