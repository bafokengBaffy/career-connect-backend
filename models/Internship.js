const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  shortDescription: {
    type: String,
    maxlength: 300
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subCategory: String,
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'remote', 'hybrid', 'project-based'],
    required: true
  },
  duration: {
    type: String,
    enum: ['1-3 months', '3-6 months', '6-12 months', 'custom'],
    required: true
  },
  customDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['weeks', 'months']
    }
  },
  location: {
    type: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid'],
      default: 'onsite'
    },
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  stipend: {
    paid: {
      type: Boolean,
      default: true
    },
    amount: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    frequency: {
      type: String,
      enum: ['monthly', 'weekly', 'daily', 'lumpsum']
    },
    negotiable: {
      type: Boolean,
      default: false
    },
    perks: [String]
  },
  requirements: {
    education: {
      level: String,
      field: String,
      isRequired: {
        type: Boolean,
        default: true
      }
    },
    skills: [{
      skill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
      },
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced']
      },
      required: {
        type: Boolean,
        default: true
      }
    }],
    experience: {
      years: Number,
      preferred: Boolean
    },
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['basic', 'conversational', 'fluent', 'native']
      }
    }],
    additionalRequirements: [String]
  },
  responsibilities: [String],
  learningOutcomes: [String],
  mentorship: {
    provided: {
      type: Boolean,
      default: true
    },
    mentorName: String,
    mentorTitle: String,
    mentorContact: String
  },
  applicationDeadline: {
    type: Date,
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  positions: {
    type: Number,
    required: true,
    min: 1
  },
  applicationsReceived: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'closed', 'expired'],
    default: 'pending',
    index: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  urgent: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  saves: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  questions: [{
    question: String,
    type: {
      type: String,
      enum: ['text', 'multiple-choice', 'file', 'boolean'],
      default: 'text'
    },
    options: [String],
    required: {
      type: Boolean,
      default: true
    }
  }],
  screeningQuestions: [{
    question: String,
    expectedAnswer: String,
    type: {
      type: String,
      enum: ['text', 'yes-no', 'multiple-choice']
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: Date,
  publishedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for search
internshipSchema.index({ title: 'text', description: 'text', tags: 'text' });
internshipSchema.index({ company: 1, status: 1, applicationDeadline: 1 });
internshipSchema.index({ 'location.city': 1, 'location.country': 1 });
internshipSchema.index({ category: 1, type: 1, duration: 1 });

// Generate slug before saving
internshipSchema.pre('validate', function(next) {
  if (this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + Math.random().toString(36).substring(2, 8);
  }
  next();
});

// Update timestamps
internshipSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-expire
  if (this.status === 'active' && this.applicationDeadline < new Date()) {
    this.status = 'expired';
  }
  
  // Set short description
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 297) + '...';
  }
  
  next();
});

// Check if accepting applications
internshipSchema.methods.isAcceptingApplications = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.applicationDeadline > now && 
         this.applicationsReceived < this.positions;
};

// Increment views
internshipSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Increment saves
internshipSchema.methods.incrementSaves = function(increment = 1) {
  this.saves += increment;
  return this.save();
};

// Get similar internships
internshipSchema.methods.getSimilar = async function(limit = 5) {
  return this.model('Internship').find({
    _id: { $ne: this._id },
    $or: [
      { category: this.category },
      { tags: { $in: this.tags } },
      { 'requirements.skills.name': { $in: this.requirements.skills.map(s => s.name) } }
    ],
    status: 'active',
    applicationDeadline: { $gt: new Date() }
  })
  .limit(limit)
  .populate('company', 'companyName logo')
  .sort('-featured -urgent -createdAt');
};

module.exports = mongoose.model('Internship', internshipSchema);