const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
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
    enum: ['academic', 'personal', 'professional', 'open-source', 'research', 'hackathon', 'other'],
    required: true
  },
  role: {
    type: String,
    trim: true
  },
  teamSize: {
    type: Number,
    min: 1
  },
  collaborators: [{
    name: String,
    email: String,
    role: String
  }],
  technologies: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    name: String,
    version: String
  }],
  images: [{
    url: String,
    publicId: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  links: [{
    type: {
      type: String,
      enum: ['github', 'live-demo', 'documentation', 'video', 'blog', 'other']
    },
    url: String,
    title: String
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  isOngoing: {
    type: Boolean,
    default: false
  },
  highlights: [String],
  outcomes: [String],
  recognition: {
    awards: [String],
    publications: [String],
    press: [String]
  },
  attachments: [{
    type: {
      type: String,
      enum: ['report', 'presentation', 'code', 'data', 'other']
    },
    url: String,
    publicId: String,
    filename: String,
    size: Number
  }],
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
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
projectSchema.index({ student: 1, featured: -1, createdAt: -1 });
projectSchema.index({ title: 'text', description: 'text', 'technologies.name': 'text' });

// Generate slug
projectSchema.pre('validate', function(next) {
  if (this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Update timestamp
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set short description
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 297) + '...';
  }
  
  next();
});

// Increment views
projectSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Increment likes
projectSchema.methods.like = function(userId) {
  // Check if already liked
  const existingLike = this.feedback.find(f => 
    f.user && f.user.toString() === userId.toString() && f.rating
  );
  
  if (!existingLike) {
    this.likes += 1;
    this.feedback.push({
      user: userId,
      rating: 5,
      createdAt: new Date()
    });
  }
  
  return this.save();
};

// Add feedback
projectSchema.methods.addFeedback = function(userId, comment, rating) {
  this.feedback.push({
    user: userId,
    comment,
    rating,
    createdAt: new Date()
  });
  
  if (rating) {
    // Recalculate average rating
    const total = this.feedback.reduce((sum, f) => sum + (f.rating || 0), 0);
    const count = this.feedback.filter(f => f.rating).length;
    this.rating = count > 0 ? total / count : 0;
  }
  
  return this.save();
};

// Get student's portfolio
projectSchema.statics.getPortfolio = function(studentId, options = {}) {
  const query = { student: studentId, isPublic: true };
  const { limit = 50, skip = 0, category } = options;
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .limit(limit)
    .skip(skip)
    .sort({ featured: -1, createdAt: -1 })
    .select('title shortDescription category technologies images featured views likes createdAt');
};

// Get featured projects
projectSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ featured: true, isPublic: true })
    .populate('student', 'name profilePicture')
    .limit(limit)
    .sort({ likes: -1, views: -1 });
};

module.exports = mongoose.model('Project', projectSchema);