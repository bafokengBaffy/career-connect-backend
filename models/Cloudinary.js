const mongoose = require('mongoose');

const cloudinarySchema = new mongoose.Schema({
  // Cloudinary Resource Information
  publicId: {
    type: String,
    required: [true, 'Public ID is required'],
    unique: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  format: {
    type: String,
    required: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'raw', 'auto']
  },
  createdAt: {
    type: Date,
    required: true
  },
  
  // File Details
  bytes: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['upload', 'authenticated', 'private'],
    default: 'upload'
  },
  etag: String,
  placeholder: Boolean,
  
  // URLs
  url: {
    type: String,
    required: true
  },
  secureUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  
  // Transformations
  transformations: [{
    name: String,
    url: String,
    secureUrl: String,
    width: Number,
    height: Number,
    format: String
  }],
  
  // Metadata
  originalFilename: String,
  tags: [{
    type: String,
    index: true
  }],
  context: {
    type: Map,
    of: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Image-specific fields
  imageMetadata: {
    colors: [{
      color: String,
      percentage: Number
    }],
    predominantColors: [String],
    faces: [{
      boundingBox: {
        left: Number,
        top: Number,
        width: Number,
        height: Number
      },
      confidence: Number,
      age: Number,
      gender: String,
      expression: String
    }],
    quality: Number,
    dpi: Number,
    aspectRatio: Number
  },
  
  // Video-specific fields
  videoMetadata: {
    duration: Number,
    bitrate: Number,
    frameRate: Number,
    audioCodec: String,
    videoCodec: String,
    rotation: Number,
    hasAudio: Boolean,
    hasFrames: Boolean
  },
  
  // Accessibility
  alt: String,
  caption: String,
  description: String,
  
  // Access Control
  accessMode: {
    type: String,
    enum: ['public', 'authenticated'],
    default: 'public'
  },
  accessControl: [{
    type: String,
    value: String,
    startDate: Date,
    endDate: Date
  }],
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'manual'],
    default: 'pending'
  },
  moderationNotes: String,
  moderationLabels: [String],
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  moderatedAt: Date,
  
  // Ownership
  uploadedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userType: {
      type: String,
      enum: ['student', 'company', 'admin', 'institution'],
      required: true
    },
    email: String
  },
  
  // Related Entity
  relatedTo: {
    entityType: {
      type: String,
      enum: [
        'user', 'company', 'institution', 'course', 'job', 
        'internship', 'project', 'application', 'news', 'review'
      ],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedTo.entityType'
    }
  },
  
  // Usage Statistics
  usage: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    lastAccessed: Date,
    referrers: [{
      url: String,
      count: Number,
      lastVisit: Date
    }]
  },
  
  // Cloudinary Sync Status
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed', 'deleted'],
    default: 'synced'
  },
  syncError: String,
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  
  // Backup Information
  backup: {
    isBackedUp: {
      type: Boolean,
      default: false
    },
    backupUrl: String,
    backupLocation: String,
    backedUpAt: Date
  },
  
  // Expiration
  expiresAt: Date,
  isExpired: {
    type: Boolean,
    default: false
  },
  
  // Deletion Information
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
cloudinarySchema.index({ 'uploadedBy.userId': 1, createdAt: -1 });
cloudinarySchema.index({ resourceType: 1, format: 1 });
cloudinarySchema.index({ tags: 1 });
cloudinarySchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });
cloudinarySchema.index({ moderationStatus: 1, createdAt: -1 });

// Virtual for file size formatted
cloudinarySchema.virtual('formattedSize').get(function() {
  const bytes = this.bytes;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for age
cloudinarySchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)) + ' days';
});

// Pre-save middleware
cloudinarySchema.pre('save', function(next) {
  // Check if expired
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.isExpired = true;
  }
  
  next();
});

// Method to increment views
cloudinarySchema.methods.incrementViews = async function(referrer = null) {
  this.usage.views += 1;
  this.usage.lastAccessed = new Date();
  
  if (referrer) {
    const existingReferrer = this.usage.referrers.find(r => r.url === referrer);
    if (existingReferrer) {
      existingReferrer.count += 1;
      existingReferrer.lastVisit = new Date();
    } else {
      this.usage.referrers.push({
        url: referrer,
        count: 1,
        lastVisit: new Date()
      });
    }
  }
  
  return this.save();
};

// Method to increment downloads
cloudinarySchema.methods.incrementDownloads = async function() {
  this.usage.downloads += 1;
  this.usage.lastAccessed = new Date();
  return this.save();
};

// Method to add transformation
cloudinarySchema.methods.addTransformation = async function(transformationData) {
  this.transformations.push(transformationData);
  return this.save();
};

// Method to moderate
cloudinarySchema.methods.moderate = async function(status, adminId, notes = '') {
  this.moderationStatus = status;
  this.moderationNotes = notes;
  this.moderatedBy = adminId;
  this.moderatedAt = new Date();
  return this.save();
};

// Static method to find by entity
cloudinarySchema.statics.findByEntity = function(entityType, entityId) {
  return this.find({
    'relatedTo.entityType': entityType,
    'relatedTo.entityId': entityId,
    syncStatus: 'synced'
  }).sort('-createdAt');
};

// Static method to find by user
cloudinarySchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({
    'uploadedBy.userId': userId,
    syncStatus: 'synced'
  })
    .sort('-createdAt')
    .limit(limit);
};

// Static method to get storage summary
cloudinarySchema.statics.getStorageSummary = async function(userId = null) {
  const match = userId ? { 'uploadedBy.userId': mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: { ...match, syncStatus: 'synced' } },
    {
      $group: {
        _id: '$resourceType',
        count: { $sum: 1 },
        totalBytes: { $sum: '$bytes' },
        avgBytes: { $avg: '$bytes' },
        minBytes: { $min: '$bytes' },
        maxBytes: { $max: '$bytes' },
        formats: { $addToSet: '$format' }
      }
    },
    {
      $project: {
        resourceType: '$_id',
        count: 1,
        totalBytes: 1,
        formattedTotal: {
          $concat: [
            { $toString: { $round: [{ $divide: ['$totalBytes', 1048576] }, 2] } },
            ' MB'
          ]
        },
        avgBytes: 1,
        minBytes: 1,
        maxBytes: 1,
        formats: 1
      }
    }
  ]);
};

// Static method to get tag cloud
cloudinarySchema.statics.getTagCloud = async function(limit = 50) {
  return this.aggregate([
    { $match: { syncStatus: 'synced' } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Static method to cleanup expired resources
cloudinarySchema.statics.cleanupExpired = async function() {
  const expired = await this.find({
    expiresAt: { $lt: new Date() },
    isExpired: false
  });
  
  for (const resource of expired) {
    resource.isExpired = true;
    resource.syncStatus = 'deleted';
    await resource.save();
    
    // Here you would also delete from Cloudinary
  }
  
  return expired.length;
};

// Static method to sync with Cloudinary
cloudinarySchema.statics.syncWithCloudinary = async function(publicId, cloudinaryData) {
  return this.findOneAndUpdate(
    { publicId },
    {
      ...cloudinaryData,
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Cloudinary', cloudinarySchema);