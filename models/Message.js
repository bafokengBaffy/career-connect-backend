const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['student', 'company', 'admin'],
    required: true
  },
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userType: {
      type: String,
      enum: ['student', 'company', 'admin'],
      required: true
    },
    readAt: Date,
    deliveredAt: Date,
    archivedAt: Date,
    deletedAt: Date
  }],
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 5000
    },
    html: String,
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'document', 'video', 'audio', 'other']
      },
      url: String,
      publicId: String,
      filename: String,
      size: Number,
      mimeType: String,
      thumbnail: String
    }],
    mentions: [{
      user: mongoose.Schema.Types.ObjectId,
      type: String,
      indices: [Number]
    }]
  },
  metadata: {
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    subject: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    tags: [String],
    context: {
      type: {
        type: String,
        enum: ['application', 'job', 'internship', 'general']
      },
      entityId: mongoose.Schema.Types.ObjectId,
      entityType: String
    }
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  isAnnouncement: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user: mongoose.Schema.Types.ObjectId,
    reaction: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  flags: [{
    type: {
      type: String,
      enum: ['important', 'spam', 'inappropriate', 'urgent']
    },
    user: mongoose.Schema.Types.ObjectId,
    note: String,
    createdAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ 'recipients.user': 1, 'recipients.readAt': 1 });

// Update timestamp
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate conversation ID before save
messageSchema.pre('validate', async function(next) {
  if (!this.conversationId) {
    // Sort user IDs to ensure consistent conversation ID
    const userIds = [
      this.sender.toString(),
      ...this.recipients.map(r => r.user.toString())
    ].sort();
    
    this.conversationId = userIds.join('_');
  }
  next();
});

// Mark as read for a recipient
messageSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
    
    // Check if all recipients have read
    const allRead = this.recipients.every(r => r.readAt);
    if (allRead) {
      this.status = 'read';
    }
  }
  return this.save();
};

// Mark as delivered for a recipient
messageSchema.methods.markAsDelivered = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient && !recipient.deliveredAt) {
    recipient.deliveredAt = new Date();
    
    // Check if all recipients have delivered
    const allDelivered = this.recipients.every(r => r.deliveredAt);
    if (allDelivered) {
      this.status = 'delivered';
    }
  }
  return this.save();
};

// Archive for a user
messageSchema.methods.archive = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.archivedAt = new Date();
  }
  return this.save();
};

// Soft delete for a user
messageSchema.methods.softDelete = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.deletedAt = new Date();
  }
  return this.save();
};

// Add reaction
messageSchema.methods.addReaction = function(userId, reaction) {
  const existingReaction = this.reactions.find(r => r.user.toString() === userId.toString());
  if (existingReaction) {
    existingReaction.reaction = reaction;
  } else {
    this.reactions.push({ user: userId, reaction });
  }
  return this.save();
};

// Remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

// Get conversation
messageSchema.statics.getConversation = function(conversationId, options = {}) {
  const query = { conversationId };
  const { limit = 50, before = new Date(), after } = options;
  
  if (after) {
    query.createdAt = { $gt: after };
  } else if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('sender', 'name email profilePicture')
    .populate('recipients.user', 'name email profilePicture')
    .limit(limit)
    .sort('-createdAt');
};

// Get unread count for user
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    'recipients': {
      $elemMatch: {
        user: userId,
        readAt: null,
        deletedAt: null
      }
    }
  });
};

module.exports = mongoose.model('Message', messageSchema);