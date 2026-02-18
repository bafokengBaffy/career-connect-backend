const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    lowercase: true,
    trim: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, 'Please provide a valid URL']
  },
  
  // Company Details
  description: {
    type: String,
    required: [true, 'Company description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    enum: [
      'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
      'Retail', 'Construction', 'Transportation', 'Hospitality', 'Media',
      'Agriculture', 'Energy', 'Telecommunications', 'Consulting', 'Other'
    ]
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    default: '1-10'
  },
  foundedYear: {
    type: Number,
    min: [1800, 'Founded year must be after 1800'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future']
  },
  
  // Location
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: String,
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'Lesotho'
    },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Media
  logo: {
    url: String,
    publicId: String,
    alt: String
  },
  coverImage: {
    url: String,
    publicId: String,
    alt: String
  },
  gallery: [{
    url: String,
    publicId: String,
    alt: String,
    caption: String
  }],
  videos: [{
    url: String,
    title: String,
    description: String
  }],
  
  // Social Media
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String,
    youtube: String
  },
  
  // Business Details
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  taxId: {
    type: String,
    unique: true,
    sparse: true
  },
  businessType: {
    type: String,
    enum: ['Private', 'Public', 'Non-Profit', 'Government', 'Partnership', 'Sole Proprietorship'],
    default: 'Private'
  },
  
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationDocuments: [{
    name: String,
    url: String,
    publicId: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  rejectionReason: String,
  
  // Relationships
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  managers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    },
    permissions: [String],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Jobs and Internships
  jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  internships: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship'
  }],
  
  // Reviews and Ratings
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  
  // Benefits and Perks
  benefits: [{
    name: String,
    description: String,
    icon: String
  }],
  
  // Culture and Values
  culture: {
    mission: String,
    vision: String,
    values: [String],
    workEnvironment: String,
    teamDescription: String
  },
  
  // Contact Person
  contactPerson: {
    name: String,
    position: String,
    email: String,
    phone: String
  },
  
  // Statistics
  statistics: {
    totalHires: {
      type: Number,
      default: 0
    },
    activeJobs: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    applicationRate: {
      type: Number,
      default: 0
    }
  },
  
  // Subscription and Payment
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    paymentMethod: String,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // Featured Status
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  featuredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Settings
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    jobAlerts: {
      type: Boolean,
      default: true
    },
    privacyMode: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Africa/Maseru'
    }
  },
  
  // SEO and Meta
  seo: {
    title: String,
    description: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true
    }
  },
  
  // Timestamps
  lastActive: {
    type: Date,
    default: Date.now
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
companySchema.index({ name: 'text', description: 'text', industry: 'text' });
companySchema.index({ location: '2dsphere' });
companySchema.index({ verificationStatus: 1, createdAt: -1 });
companySchema.index({ industry: 1, averageRating: -1 });
companySchema.index({ 'seo.slug': 1 });

// Virtual for active jobs count
companySchema.virtual('activeJobsCount').get(function() {
  return this.jobs ? this.jobs.length : 0;
});

// Virtual for follower count
companySchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Pre-save middleware to generate slug
companySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo?.slug) {
    this.seo = this.seo || {};
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

// Method to check if company is verified
companySchema.methods.isVerified = function() {
  return this.verificationStatus === 'verified';
};

// Method to check if company is featured
companySchema.methods.isFeatured = function() {
  return this.isFeatured && this.featuredUntil > new Date();
};

// Static method to find featured companies
companySchema.statics.findFeatured = function() {
  return this.find({
    isFeatured: true,
    featuredUntil: { $gt: new Date() }
  }).sort('-averageRating');
};

// Static method to find companies by industry
companySchema.statics.findByIndustry = function(industry, limit = 10) {
  return this.find({ industry, verificationStatus: 'verified' })
    .sort('-averageRating')
    .limit(limit);
};

module.exports = mongoose.model('Company', companySchema);