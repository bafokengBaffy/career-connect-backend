const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'application_submitted',
      'application_viewed',
      'application_status_change',
      'application_shortlisted',
      'interview_scheduled',
      'job_alert',
      'internship_alert',
      'company_follow',
      'company_update',
      'message_received',
      'review_response',
      'profile_view',
      'system_alert',
      'deadline_reminder',
      'offer_received',
      'offer_accepted',
      'welcome',
      'account_update',
      'security_alert'
    ],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    entityType: {
      type: String,
      enum: ['job', 'internship', 'company', 'application', 'message', 'user']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    actionUrl: String,
    additionalData: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  expiresAt: Date,
  channels: [{
    type: String,
    enum: ['in-app', 'email', 'push', 'sms'],
    default: ['in-app']
  }],
  deliveryStatus: {
    inApp: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date
    },
    email: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      emailId: String,
      error: String
    },
    push: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      pushId: String,
      error: String
    },
    sms: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      messageId: String,
      error: String
    }
  },
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

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update timestamp
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Mark as read
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Mark as delivered
notificationSchema.methods.markDelivered = function(channel, metadata = {}) {
  if (channel === 'in-app') {
    this.deliveryStatus.inApp.delivered = true;
    this.deliveryStatus.inApp.deliveredAt = new Date();
  } else if (channel === 'email') {
    this.deliveryStatus.email.delivered = true;
    this.deliveryStatus.email.deliveredAt = new Date();
    if (metadata.emailId) this.deliveryStatus.email.emailId = metadata.emailId;
  } else if (channel === 'push') {
    this.deliveryStatus.push.delivered = true;
    this.deliveryStatus.push.deliveredAt = new Date();
    if (metadata.pushId) this.deliveryStatus.push.pushId = metadata.pushId;
  }
  
  return this.save();
};

// Mark delivery failed
notificationSchema.methods.markDeliveryFailed = function(channel, error) {
  if (channel === 'email') {
    this.deliveryStatus.email.error = error;
  } else if (channel === 'push') {
    this.deliveryStatus.push.error = error;
  }
  return this.save();
};

// Archive notification
notificationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false,
    isDeleted: false
  });
};

// Create notification for multiple recipients
notificationSchema.statics.createBulk = async function(recipients, notificationData) {
  const notifications = recipients.map(recipientId => ({
    recipient: recipientId,
    ...notificationData,
    createdAt: new Date()
  }));
  
  return this.insertMany(notifications);
};

// Get user notifications with pagination
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const query = {
    recipient: userId,
    isDeleted: false,
    ...options.filter
  };
  
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  return this.find(query)
    .limit(limit)
    .skip(skip)
    .sort(sort);
};

// Clean up old notifications
notificationSchema.statics.cleanupOldNotifications = async function(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      isRead: true
    },
    {
      isDeleted: true
    }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);