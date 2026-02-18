const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  positionType: {
    type: String,
    enum: ['job', 'internship'],
    required: true,
    index: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  internship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'under-review',
      'shortlisted',
      'interview',
      'technical-test',
      'hr-round',
      'offered',
      'accepted',
      'rejected',
      'withdrawn',
      'on-hold'
    ],
    default: 'submitted',
    index: true
  },
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  applicationData: {
    coverLetter: {
      type: String,
      maxlength: 5000
    },
    resume: {
      url: String,
      publicId: String,
      filename: String
    },
    portfolio: String,
    linkedIn: String,
    github: String,
    website: String,
    expectedSalary: {
      amount: Number,
      currency: {
        type: String,
        default: 'USD'
      },
      period: {
        type: String,
        enum: ['hour', 'month', 'year']
      }
    },
    noticePeriod: {
      days: Number,
      negotiable: Boolean
    },
    currentEmployment: {
      company: String,
      position: String,
      years: Number
    },
    preferredLocation: String,
    willingToRelocate: {
      type: Boolean,
      default: true
    },
    workAuthorization: {
      country: String,
      status: String
    }
  },
  responses: [{
    questionId: String,
    question: String,
    answer: mongoose.Schema.Types.Mixed,
    attachments: [{
      url: String,
      filename: String
    }]
  }],
  screeningAnswers: [{
    question: String,
    answer: String,
    isCorrect: Boolean
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['resume', 'cover-letter', 'portfolio', 'certificate', 'other']
    },
    url: String,
    publicId: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  interviewSchedule: {
    scheduled: {
      type: Boolean,
      default: false
    },
    rounds: [{
      round: Number,
      type: {
        type: String,
        enum: ['phone', 'video', 'in-person', 'technical', 'hr']
      },
      scheduledAt: Date,
      duration: Number, // in minutes
      meetingLink: String,
      location: String,
      interviewer: {
        name: String,
        email: String,
        userId: mongoose.Schema.Types.ObjectId
      },
      feedback: String,
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
        default: 'scheduled'
      }
    }],
    feedback: String
  },
  offer: {
    extendedAt: Date,
    expiresAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    details: {
      salary: Number,
      joiningDate: Date,
      position: String,
      location: String,
      benefits: [String],
      additionalNotes: String
    },
    documents: [{
      type: String,
      url: String,
      signedUrl: String,
      signedAt: Date
    }]
  },
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isPrivate: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  flags: [{
    type: {
      type: String,
      enum: ['duplicate', 'incomplete', 'needs-review', 'potential-fraud']
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.ObjectId
  }],
  isBookmarked: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  viewedByCompany: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for unique applications
applicationSchema.index({ student: 1, job: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { job: { $exists: true } }
});
applicationSchema.index({ student: 1, internship: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { internship: { $exists: true } }
});

// Indexes for querying
applicationSchema.index({ company: 1, status: 1, submittedAt: -1 });
applicationSchema.index({ 'interviewSchedule.scheduled': 1, 'interviewSchedule.rounds.scheduledAt': 1 });

// Update timestamp
applicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set submittedAt on first save with status 'submitted'
  if (this.isNew && this.status === 'submitted') {
    this.submittedAt = new Date();
  }
  
  // Add to status history
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  
  next();
});

// Add to status history
applicationSchema.methods.updateStatus = function(newStatus, userId, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    note,
    timestamp: new Date()
  });
  return this.save();
};

// Track view by company
applicationSchema.methods.markAsViewed = function(userId) {
  if (!this.viewedByCompany) {
    this.viewedByCompany = true;
    this.viewedAt = new Date();
  }
  
  this.viewedBy.push({
    user: userId,
    viewedAt: new Date()
  });
  
  return this.save();
};

// Get application timeline
applicationSchema.methods.getTimeline = function() {
  return this.statusHistory.map(entry => ({
    status: entry.status,
    date: entry.timestamp,
    note: entry.note
  }));
};

// Check if can withdraw
applicationSchema.methods.canWithdraw = function() {
  const withdrawableStatuses = ['draft', 'submitted', 'under-review'];
  return withdrawableStatuses.includes(this.status);
};

module.exports = mongoose.model('Application', applicationSchema);