const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['company'],
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  notificationPreferences: {
    newJobs: {
      type: Boolean,
      default: true
    },
    newInternships: {
      type: Boolean,
      default: true
    },
    updates: {
      type: Boolean,
      default: true
    },
    announcements: {
      type: Boolean,
      default: false
    }
  },
  notes: String,
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  followedAt: {
    type: Date,
    default: Date.now
  },
  unfollowedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique follows
followSchema.index({ follower: 1, targetType: 1, company: 1 }, { unique: true });

// Index for querying
followSchema.index({ company: 1, isActive: 1 });
followSchema.index({ follower: 1, isActive: 1, createdAt: -1 });

// Update timestamp
followSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// After save, update company's follower count
followSchema.post('save', async function() {
  if (this.isActive) {
    const Company = mongoose.model('Company');
    await Company.findByIdAndUpdate(this.company, {
      $inc: { followersCount: 1 }
    });
  }
});

// After remove or update, update company's follower count
followSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    const Company = mongoose.model('Company');
    const count = await doc.constructor.countDocuments({
      company: doc.company,
      isActive: true
    });
    
    await Company.findByIdAndUpdate(doc.company, {
      followersCount: count
    });
  }
});

// Unfollow
followSchema.methods.unfollow = function() {
  this.isActive = false;
  this.unfollowedAt = new Date();
  return this.save();
};

// Refollow
followSchema.methods.refollow = function() {
  this.isActive = true;
  this.unfollowedAt = null;
  return this.save();
};

// Update notification preferences
followSchema.methods.updateNotifications = function(preferences) {
  Object.assign(this.notificationPreferences, preferences);
  return this.save();
};

// Get followers of a company
followSchema.statics.getCompanyFollowers = function(companyId, options = {}) {
  const query = { company: companyId, isActive: true };
  const { limit = 50, skip = 0 } = options;
  
  return this.find(query)
    .populate('follower', 'name email profilePicture')
    .limit(limit)
    .skip(skip)
    .sort('-followedAt');
};

// Get companies followed by a student
followSchema.statics.getStudentFollows = function(studentId, options = {}) {
  const query = { follower: studentId, isActive: true };
  const { limit = 50, skip = 0 } = options;
  
  return this.find(query)
    .populate('company')
    .limit(limit)
    .skip(skip)
    .sort('-followedAt');
};

module.exports = mongoose.model('Follow', followSchema);