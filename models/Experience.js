const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance', 'self-employed'],
    required: true
  },
  location: {
    city: String,
    state: String,
    country: String,
    remote: {
      type: Boolean,
      default: false
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  isCurrent: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    maxlength: 5000
  },
  achievements: [{
    description: String,
    technologies: [String],
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  technologies: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    name: String,
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    }
  }],
  responsibilities: [String],
  projects: [{
    name: String,
    description: String,
    technologies: [String],
    link: String
  }],
  supervisor: {
    name: String,
    title: String,
    email: String,
    phone: String
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['linkedin', 'email', 'document', 'manual']
    },
    document: {
      url: String,
      publicId: String,
      filename: String
    },
    verifiedAt: Date,
    verifiedBy: String
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
experienceSchema.index({ student: 1, startDate: -1 });
experienceSchema.index({ companyName: 1, position: 1 });

// Update timestamp
experienceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate isCurrent
  if (!this.endDate && !this.isCurrent) {
    this.isCurrent = true;
  } else if (this.endDate && this.isCurrent) {
    this.isCurrent = false;
  }
  
  next();
});

// Format duration
experienceSchema.methods.formatDuration = function() {
  const months = this.calculateDuration();
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  const parts = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`);
  }
  
  return parts.join(' ') || 'Less than a month';
};

// Calculate duration in months
experienceSchema.methods.calculateDuration = function() {
  const end = this.isCurrent ? new Date() : this.endDate;
  const start = this.startDate;
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  return years * 12 + months;
};

// Get student's work timeline
experienceSchema.statics.getTimeline = function(studentId) {
  return this.find({ student: studentId })
    .sort({ startDate: -1 })
    .select('companyName position employmentType startDate endDate isCurrent isHighlighted');
};

// Mark as verified
experienceSchema.methods.verify = function(method, verifiedBy) {
  this.verification = {
    isVerified: true,
    method,
    verifiedAt: new Date(),
    verifiedBy
  };
  return this.save();
};

module.exports = mongoose.model('Experience', experienceSchema);