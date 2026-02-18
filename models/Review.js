const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  positionType: {
    type: String,
    enum: ['job', 'internship'],
    required: true
  },
  position: {
    type: String,
    required: true
  },
  employmentStatus: {
    type: String,
    enum: ['current', 'former'],
    required: true
  },
  duration: {
    months: Number,
    years: Number
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  pros: {
    type: String,
    maxlength: 2000
  },
  cons: {
    type: String,
    maxlength: 2000
  },
  advice: {
    type: String,
    maxlength: 2000
  },
  ratings: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    culture: {
      type: Number,
      min: 1,
      max: 5
    },
    workLifeBalance: {
      type: Number,
      min: 1,
      max: 5
    },
    compensation: {
      type: Number,
      min: 1,
      max: 5
    },
    careerGrowth: {
      type: Number,
      min: 1,
      max: 5
    },
    management: {
      type: Number,
      min: 1,
      max: 5
    },
    learning: {
      type: Number,
      min: 1,
      max: 5
    },
    facilities: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'linkedin', 'offer-letter', 'payslip', 'other']
  },
  verificationDocument: {
    url: String,
    publicId: String
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  reports: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    helpful: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  responses: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    content: String,
    isOfficial: {
      type: Boolean,
      default: true
    },
    helpful: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  moderationNotes: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  moderatedAt: Date,
  editedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one review per student per company
reviewSchema.index({ student: 1, company: 1 }, { unique: true });

// Indexes for querying
reviewSchema.index({ company: 1, status: 1, createdAt: -1 });
reviewSchema.index({ ratings: 1, helpful: -1 });
reviewSchema.index({ verified: 1, isAnonymous: 1 });

// Update timestamp
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate overall rating if not provided
  if (!this.ratings.overall && this.ratings) {
    const ratingValues = Object.values(this.ratings).filter(v => typeof v === 'number');
    if (ratingValues.length > 0) {
      this.ratings.overall = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
    }
  }
  
  next();
});

// After save, update company's average rating
reviewSchema.post('save', async function() {
  const Company = mongoose.model('Company');
  await Company.findByIdAndUpdate(this.company, {
    $inc: { reviewsCount: 1 }
  });
  
  // Recalculate average rating
  const Review = this.constructor;
  const stats = await Review.aggregate([
    { $match: { company: this.company, status: 'approved' } },
    { $group: {
        _id: null,
        avgRating: { $avg: '$ratings.overall' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Company.findByIdAndUpdate(this.company, {
      averageRating: stats[0].avgRating
    });
  }
});

// Mark as helpful
reviewSchema.methods.markHelpful = function(increment = true) {
  this.helpful += increment ? 1 : -1;
  return this.save();
};

// Add comment
reviewSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date()
  });
  return this.save();
};

// Add company response
reviewSchema.methods.addResponse = function(companyId, content) {
  this.responses.push({
    company: companyId,
    content,
    createdAt: new Date()
  });
  return this.save();
};

// Check if can be edited
reviewSchema.methods.canEdit = function() {
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  return hoursSinceCreation < 48 && this.status === 'approved';
};

module.exports = mongoose.model('Review', reviewSchema);