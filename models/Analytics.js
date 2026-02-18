const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'page_view', 'user_login', 'user_signup', 'job_view', 'job_apply',
      'company_view', 'course_view', 'course_enroll', 'search', 'filter',
      'save_item', 'share_item', 'download', 'upload', 'error', 'api_call',
      'notification_sent', 'notification_clicked', 'email_sent', 'email_opened',
      'payment_initiated', 'payment_completed', 'payment_failed', 'subscription'
    ],
    index: true
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userType: {
    type: String,
    enum: ['student', 'company', 'admin', 'guest', 'institution']
  },
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  
  // Event Details
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: Number, // Time spent in milliseconds
  
  // Page/Resource Information
  page: {
    url: String,
    path: String,
    query: mongoose.Schema.Types.Mixed,
    referrer: String,
    title: String
  },
  
  // Target Information
  targetType: {
    type: String,
    enum: [
      'job', 'company', 'course', 'institution', 'user', 'article',
      'notification', 'application', 'internship', 'project', 'skill'
    ]
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType'
  },
  targetName: String,
  
  // Action Data
  action: {
    type: {
      type: String,
      enum: ['click', 'view', 'submit', 'update', 'delete', 'create']
    },
    data: mongoose.Schema.Types.Mixed,
    result: String,
    success: Boolean
  },
  
  // Search Data
  search: {
    query: String,
    filters: mongoose.Schema.Types.Mixed,
    results: Number,
    page: Number,
    sortBy: String
  },
  
  // Location Data
  location: {
    country: String,
    city: String,
    region: String,
    timezone: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Device Information
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'bot']
    },
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    screenResolution: String,
    language: String
  },
  
  // Performance Metrics
  performance: {
    pageLoadTime: Number,
    timeToInteractive: Number,
    apiResponseTime: Number,
    resourceSize: Number
  },
  
  // Business Metrics
  metrics: {
    value: Number, // Monetary value if applicable
    quantity: Number,
    conversion: Boolean,
    revenue: Number,
    cost: Number
  },
  
  // Engagement Metrics
  engagement: {
    scrollDepth: Number,
    timeOnPage: Number,
    interactions: Number,
    bounceRate: Boolean
  },
  
  // Custom Data
  customData: mongoose.Schema.Types.Mixed,
  
  // Tags for categorization
  tags: [String],
  
  // Source Information
  source: {
    type: {
      type: String,
      enum: ['direct', 'organic', 'referral', 'social', 'email', 'paid']
    },
    medium: String,
    campaign: String,
    content: String,
    term: String
  },
  
  // Error Information (for error events)
  error: {
    code: String,
    message: String,
    stack: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },
  
  // Aggregation Metadata
  aggregated: {
    isAggregated: {
      type: Boolean,
      default: false
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly']
    },
    count: Number,
    unique: Number
  }
}, {
  timestamps: true,
  strict: false // Allow flexible schema for custom data
});

// Compound indexes for common queries
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
analyticsSchema.index({ 'source.campaign': 1, timestamp: -1 });
analyticsSchema.index({ 'location.country': 1, timestamp: -1 });

// TTL index for automatic data cleanup (30 days)
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Static method to track an event
analyticsSchema.statics.track = async function(data) {
  try {
    const event = new this(data);
    return await event.save();
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return null;
  }
};

// Static method to get page views by date range
analyticsSchema.statics.getPageViews = async function(startDate, endDate, options = {}) {
  const match = {
    eventType: 'page_view',
    timestamp: { $gte: startDate, $lte: endDate }
  };
  
  if (options.page) match['page.path'] = options.page;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          page: '$page.path'
        },
        count: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$sessionId' },
        avgTimeOnPage: { $avg: '$engagement.timeOnPage' }
      }
    },
    { $sort: { '_id.date': -1 } }
  ]);
};

// Static method to get user engagement metrics
analyticsSchema.statics.getUserEngagement = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        avgSessionDuration: { $avg: '$duration' },
        pageViews: {
          $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
        },
        jobViews: {
          $sum: { $cond: [{ $eq: ['$eventType', 'job_view'] }, 1, 0] }
        },
        applications: {
          $sum: { $cond: [{ $eq: ['$eventType', 'job_apply'] }, 1, 0] }
        },
        lastActive: { $max: '$timestamp' }
      }
    }
  ]);
};

// Static method to get conversion funnel
analyticsSchema.statics.getConversionFunnel = async function(startDate, endDate, funnel = []) {
  const stages = funnel.map(event => ({
    $match: {
      eventType: event,
      timestamp: { $gte: startDate, $lte: endDate }
    }
  }));
  
  const results = [];
  for (const stage of stages) {
    const count = await this.countDocuments(stage.$match);
    results.push(count);
  }
  
  return results;
};

// Static method to get real-time active users
analyticsSchema.statics.getActiveUsers = async function(minutes = 5) {
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);
  
  return this.distinct('sessionId', {
    timestamp: { $gte: since },
    eventType: { $in: ['page_view', 'api_call'] }
  }).then(sessions => sessions.length);
};

// Static method to get popular content
analyticsSchema.statics.getPopularContent = async function(type, limit = 10, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        targetType: type,
        eventType: `${type}_view`,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$targetId',
        views: { $sum: 1 },
        uniqueViewers: { $addToSet: '$userId' },
        lastViewed: { $max: '$timestamp' }
      }
    },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: type + 's',
        localField: '_id',
        foreignField: '_id',
        as: 'details'
      }
    },
    { $unwind: '$details' }
  ]);
};

// Static method to get analytics dashboard data
analyticsSchema.statics.getDashboardData = async function() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    totalEvents,
    topEvents,
    pageViews
  ] = await Promise.all([
    this.distinct('userId', { timestamp: { $gte: startOfDay } }).then(u => u.length),
    this.distinct('userId', { timestamp: { $gte: startOfWeek } }).then(u => u.length),
    this.distinct('userId', { timestamp: { $gte: startOfMonth } }).then(u => u.length),
    this.countDocuments({ timestamp: { $gte: startOfDay } }),
    this.aggregate([
      { $match: { timestamp: { $gte: startOfDay } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    this.aggregate([
      { $match: { eventType: 'page_view', timestamp: { $gte: startOfDay } } },
      { $group: { _id: '$page.path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);
  
  return {
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    totalEvents,
    topEvents,
    pageViews
  };
};

module.exports = mongoose.model('Analytics', analyticsSchema);