// @ts-nocheck
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (/** @type {{ body: { recipient: any; subject: any; content: any; attachments: any; }; user: { id: any; firstName: any; lastName: any; }; }} */ req, /** @type {{ status: (arg0: number) => { (): any; new (): any; json: { (arg0: { success: boolean; message: string; data?: never; error?: any; }): void; new (): any; }; }; }} */ res) => {
  try {
    const { recipient, subject, content, attachments } = req.body;
    
    // Check if recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    const message = await Message.create({
      sender: req.user.id,
      recipient,
      subject,
      content,
      attachments
    });
    
    // Create notification
    await Notification.create({
      recipient,
      type: 'new_message',
      title: 'New Message',
      message: `You have a new message from ${req.user.firstName} ${req.user.lastName}`,
      data: {
        messageId: message._id,
        sender: req.user.id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// @desc    Get user's messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { folder = 'inbox', page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (folder === 'inbox') {
      query.recipient = req.user.id;
    } else if (folder === 'sent') {
      query.sender = req.user.id;
    } else if (folder === 'archive') {
      query.$or = [
        { recipient: req.user.id, archivedByRecipient: true },
        { sender: req.user.id, archivedBySender: true }
      ];
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email profilePicture')
      .populate('recipient', 'firstName lastName email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Message.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Message.countDocuments({
      recipient: req.user.id,
      read: false
    });
    
    res.json({
      success: true,
      data: {
        messages,
        unreadCount
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email profilePicture')
      .populate('recipient', 'firstName lastName email profilePicture');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check authorization
    if (message.sender._id.toString() !== req.user.id && 
        message.recipient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }
    
    // Mark as read if recipient
    if (message.recipient._id.toString() === req.user.id && !message.read) {
      message.read = true;
      message.readAt = Date.now();
      await message.save();
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching message',
      error: error.message
    });
  }
};

// @desc    Reply to message
// @route   POST /api/messages/:id/reply
// @access  Private
exports.replyToMessage = async (req, res) => {
  try {
    const originalMessage = await Message.findById(req.params.id);
    
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Original message not found'
      });
    }
    
    // Determine recipient (reply to sender)
    const recipient = originalMessage.sender._id.toString() === req.user.id 
      ? originalMessage.recipient 
      : originalMessage.sender;
    
    const reply = await Message.create({
      sender: req.user.id,
      recipient,
      subject: `Re: ${originalMessage.subject}`,
      content: req.body.content,
      attachments: req.body.attachments,
      parentMessage: originalMessage._id
    });
    
    // Update original message as replied
    originalMessage.replied = true;
    await originalMessage.save();
    
    // Create notification
    await Notification.create({
      recipient,
      type: 'message_reply',
      title: 'New Reply',
      message: `${req.user.firstName} ${req.user.lastName} replied to your message`,
      data: {
        messageId: reply._id,
        parentId: originalMessage._id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: reply
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending reply',
      error: error.message
    });
  }
};

// @desc    Archive message
// @route   PUT /api/messages/:id/archive
// @access  Private
exports.archiveMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Archive based on user role
    if (message.sender.toString() === req.user.id) {
      message.archivedBySender = true;
    } else if (message.recipient.toString() === req.user.id) {
      message.archivedByRecipient = true;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this message'
      });
    }
    
    await message.save();
    
    res.json({
      success: true,
      message: 'Message archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error archiving message',
      error: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user can delete
    const isSender = message.sender.toString() === req.user.id;
    const isRecipient = message.recipient.toString() === req.user.id;
    
    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Soft delete
    if (isSender) {
      message.deletedBySender = true;
    }
    if (isRecipient) {
      message.deletedByRecipient = true;
    }
    
    // Hard delete if both deleted
    if (message.deletedBySender && message.deletedByRecipient) {
      await message.deleteOne();
    } else {
      await message.save();
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
};

// @desc    Get conversation thread
// @route   GET /api/messages/:id/thread
// @access  Private
exports.getConversationThread = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { _id: req.params.id },
        { parentMessage: req.params.id }
      ]
    })
      .populate('sender', 'firstName lastName email profilePicture')
      .populate('recipient', 'firstName lastName email profilePicture')
      .sort({ createdAt: 1 });
    
    // Check authorization for all messages
    const isAuthorized = messages.every(msg => 
      msg.sender._id.toString() === req.user.id || 
      msg.recipient._id.toString() === req.user.id
    );
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
};