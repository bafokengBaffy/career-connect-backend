const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  institution: {
    type: String,
    required: true,
    trim: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  degree: {
    type: String,
    required: true,
    trim: true
  },
  fieldOfStudy: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    trim: true
  },
  gradeType: {
    type: String,
    enum: ['percentage', 'cgpa', 'gpa', 'grade', 'other'],
    default: 'percentage'
  },
  gradeValue: {
    type: Number,
    min: 0
  },
  gradeMax: {
    type: Number,
    min: 0
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
    maxlength: 2000
  },
  achievements: [String],
  courses: [String],
  activities: [String],
  skills: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['certificate', 'transcript', 'other']
    },
    url: String,
    publicId: String,
    filename: String,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  }],
  location: {
    city: String,
    state: String,
    country: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['document', 'email', 'manual']
  },
  verificationDate: Date,
  isPublic: {
    type: Boolean,
    default: true
  },
  isCurrentEducation: {
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
educationSchema.index({ student: 1, startDate: -1 });
educationSchema.index({ institution: 1, degree: 1 });

// Update timestamp
educationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate isCurrent
  if (!this.endDate && !this.isCurrent) {
    this.isCurrent = true;
  } else if (this.endDate && this.isCurrent) {
    this.isCurrent = false;
  }
  
  next();
});

// Format for display
educationSchema.methods.formatDuration = function() {
  const startYear = this.startDate.getFullYear();
  const endYear = this.isCurrent ? 'Present' : this.endDate.getFullYear();
  return `${startYear} - ${endYear}`;
};

// Format grade for display
educationSchema.methods.formatGrade = function() {
  if (!this.grade) return '';
  
  if (this.gradeType === 'percentage') {
    return `${this.grade}%`;
  } else if (this.gradeType === 'cgpa' && this.gradeMax) {
    return `${this.grade}/${this.gradeMax}`;
  } else if (this.gradeType === 'gpa' && this.gradeMax) {
    return `${this.grade}/${this.gradeMax}`;
  }
  
  return this.grade;
};

// Get student's education timeline
educationSchema.statics.getTimeline = function(studentId) {
  return this.find({ student: studentId })
    .sort({ startDate: -1 })
    .select('institution degree fieldOfStudy startDate endDate isCurrent');
};

// Check if education can be verified
educationSchema.methods.canBeVerified = function() {
  return !this.isVerified && this.documents && this.documents.length > 0;
};

module.exports = mongoose.model('Education', educationSchema);