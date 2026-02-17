const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  profile: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    dateOfBirth: Date,
    nationality: String,
    profilePicture: String
  },
  education: {
    institution: String,
    faculty: String,
    program: String,
    yearOfStudy: String,
    expectedGraduation: Date,
    gpa: Number,
    transcripts: [String]
  },
  applications: [{
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'accepted'],
      default: 'pending'
    },
    appliedDate: { type: Date, default: Date.now },
    resumeUrl: String,
    coverLetterUrl: String,
    notes: String,
    updates: [{
      status: String,
      date: Date,
      message: String
    }]
  }],
  courses: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    title: String,
    institution: String,
    status: {
      type: String,
      enum: ['enrolled', 'in-progress', 'completed', 'dropped'],
      default: 'enrolled'
    },
    enrollmentDate: Date,
    completionDate: Date,
    grade: String,
    certificateUrl: String
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['resume', 'cover-letter', 'transcript', 'certificate', 'id', 'other']
    },
    url: String,
    uploadedDate: { type: Date, default: Date.now },
    isPublic: { type: Boolean, default: false }
  }],
  preferences: {
    jobTypes: [String],
    industries: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    remoteWork: Boolean
  },
  skills: [String],
  workExperience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    description: String,
    currentlyWorking: Boolean
  }],
  achievements: [{
    title: String,
    description: String,
    date: Date,
    issuer: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);