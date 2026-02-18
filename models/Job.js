// @ts-nocheck
// backend/models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  location: {
    type: String,
    required: [true, 'Job location is required']
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  experience: {
    min: { type: Number, default: 0 },
    max: { type: Number },
    required: { type: Boolean, default: false }
  },
  education: {
    level: String,
    field: String,
    required: { type: Boolean, default: false }
  },
  skills: [{
    type: String,
    trim: true
  }],
  responsibilities: [String],
  requirements: [String],
  benefits: [String],
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'LSL' },
    period: { type: String, enum: ['hour', 'month', 'year'], default: 'month' },
    isVisible: { type: Boolean, default: true }
  },
  applicationDeadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'expired'],
    default: 'draft'
  },
  // Fixed: Changed from method to property
  isFeatured: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applicationsCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: Date,
  closedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ category: 1, type: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ isFeatured: 1, status: 1 }); // Updated index

// Virtual for applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId'
});

// Virtual for company details
jobSchema.virtual('company', {
  ref: 'Company',
  localField: 'companyId',
  foreignField: '_id',
  justOne: true
});

// Methods
jobSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

jobSchema.methods.incrementApplications = function() {
  this.applicationsCount += 1;
  return this.save();
};

jobSchema.methods.decrementApplications = function() {
  if (this.applicationsCount > 0) {
    this.applicationsCount -= 1;
  }
  return this.save();
};

// Static methods
jobSchema.statics.getFeaturedJobs = function(limit = 10) {
  return this.find({ 
    isFeatured: true, 
    status: 'published',
    applicationDeadline: { $gt: new Date() }
  })
    .sort('-createdAt')
    .limit(limit)
    .populate('companyId', 'name logo');
};

// Pre-save middleware
jobSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    } else if (this.status === 'closed' && !this.closedAt) {
      this.closedAt = new Date();
    }
  }
  next();
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;