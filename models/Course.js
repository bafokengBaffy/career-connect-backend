const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters']
  },
  
  // Course Details
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: [
      'Programming', 'Business', 'Marketing', 'Design', 'Data Science',
      'Artificial Intelligence', 'Cloud Computing', 'Cybersecurity',
      'Soft Skills', 'Language', 'Engineering', 'Healthcare', 'Finance',
      'Project Management', 'Other'
    ]
  },
  subCategory: String,
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Beginner'
  },
  language: {
    type: String,
    default: 'English'
  },
  
  // Provider Information
  provider: {
    type: {
      type: String,
      enum: ['institution', 'company', 'individual'],
      required: true
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'provider.type'
    },
    name: String,
    logo: String
  },
  
  // Instructors
  instructors: [{
    name: {
      type: String,
      required: true
    },
    title: String,
    bio: String,
    avatar: String,
    email: String,
    linkedin: String
  }],
  
  // Course Content
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months'],
      default: 'hours'
    }
  },
  totalHours: Number,
  modules: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    order: Number,
    lessons: [{
      title: {
        type: String,
        required: true
      },
      description: String,
      type: {
        type: String,
        enum: ['video', 'text', 'quiz', 'assignment', 'resource'],
        default: 'video'
      },
      content: String,
      videoUrl: String,
      duration: Number,
      resources: [{
        name: String,
        url: String,
        type: String
      }],
      isFree: {
        type: Boolean,
        default: false
      },
      order: Number
    }]
  }],
  
  // Learning Outcomes
  learningOutcomes: [String],
  prerequisites: [String],
  targetAudience: [String],
  
  // Media
  thumbnail: {
    url: String,
    publicId: String,
    alt: String
  },
  coverImage: {
    url: String,
    publicId: String,
    alt: String
  },
  promoVideo: {
    url: String,
    thumbnail: String
  },
  
  // Pricing
  isPaid: {
    type: Boolean,
    default: false
  },
  price: {
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'LSL'
    }
  },
  discount: {
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    validUntil: Date,
    code: String
  },
  
  // Enrollment
  enrollmentCount: {
    type: Number,
    default: 0
  },
  maxStudents: Number,
  startDate: Date,
  endDate: Date,
  enrollmentDeadline: Date,
  
  // Certification
  hasCertificate: {
    type: Boolean,
    default: true
  },
  certificateTemplate: String,
  certificateIssued: {
    type: Number,
    default: 0
  },
  
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Curriculum
  syllabus: {
    type: String,
    required: [true, 'Syllabus is required']
  },
  materials: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  
  // Schedule
  schedule: {
    type: {
      type: String,
      enum: ['self-paced', 'instructor-led', 'hybrid'],
      default: 'self-paced'
    },
    sessions: [{
      title: String,
      date: Date,
      time: String,
      duration: Number,
      location: String,
      meetingUrl: String
    }]
  },
  
  // Requirements
  requirements: {
    education: String,
    experience: String,
    equipment: [String],
    software: [String]
  },
  
  // Status and Verification
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'cancelled'],
    default: 'draft'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  publishedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Tags and Categories
  tags: [String],
  
  // SEO
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  
  // Settings
  settings: {
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowQuestions: {
      type: Boolean,
      default: true
    },
    allowDownloadable: {
      type: Boolean,
      default: true
    },
    certificateTemplate: String
  },
  
  // Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1, status: 1 });
courseSchema.index({ providerId: 1, 'provider.type': 1 });
courseSchema.index({ averageRating: -1, enrollmentCount: -1 });

// Virtual for current enrollment
courseSchema.virtual('currentEnrollment').get(function() {
  return this.enrollmentCount || 0;
});

// Virtual for availability
courseSchema.virtual('isAvailable').get(function() {
  return this.status === 'published' && 
         (!this.maxStudents || this.enrollmentCount < this.maxStudents);
});

// Pre-save middleware
courseSchema.pre('save', function(next) {
  // Generate slug
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  // Calculate total hours
  if (this.modules) {
    this.totalHours = this.modules.reduce((total, module) => {
      return total + (module.lessons?.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) || 0);
    }, 0) / 60; // Convert minutes to hours
  }
  
  next();
});

// Method to enroll student
courseSchema.methods.enrollStudent = async function(userId) {
  if (this.maxStudents && this.enrollmentCount >= this.maxStudents) {
    throw new Error('Course is full');
  }
  
  this.enrollmentCount += 1;
  return this.save();
};

// Method to add review
courseSchema.methods.addReview = async function(userId, rating, comment) {
  this.reviews.push({ user: userId, rating, comment });
  this.totalReviews = this.reviews.length;
  
  // Recalculate average rating
  const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
  this.averageRating = sum / this.totalReviews;
  
  return this.save();
};

// Static method to find popular courses
courseSchema.statics.findPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort('-enrollmentCount -averageRating')
    .limit(limit);
};

// Static method to find recommended courses
courseSchema.statics.findRecommended = function(userId, limit = 5) {
  // This would typically use a recommendation algorithm
  return this.find({ status: 'published', averageRating: { $gte: 4 } })
    .sort('-enrollmentCount')
    .limit(limit);
};

module.exports = mongoose.model('Course', courseSchema);