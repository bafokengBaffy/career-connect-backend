const mongoose = require('mongoose');

const studentCompanyFeedbackSchema = new mongoose.Schema({
  relationshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentCompany',
    required: true,
    index: true
  },
  collaborationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentCompanyCollaboration'
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  feedbackType: {
    type: String,
    enum: ['student_to_company', 'company_to_student', 'mutual', 'system_generated'],
    required: true
  },
  stage: {
    type: String,
    enum: ['during_collaboration', 'mid_point', 'final', 'post_completion', 'follow_up'],
    required: true
  },
  ratings: {
    overall: { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 },
    qualityOfWork: { type: Number, min: 1, max: 5 },
    timeliness: { type: Number, min: 1, max: 5 },
    initiative: { type: Number, min: 1, max: 5 },
    teamwork: { type: Number, min: 1, max: 5 },
    technicalSkills: { type: Number, min: 1, max: 5 },
    problemSolving: { type: Number, min: 1, max: 5 },
    adaptability: { type: Number, min: 1, max: 5 },
    leadership: { type: Number, min: 1, max: 5 },
    mentorship: { type: Number, min: 1, max: 5 }
  },
  feedback: {
    strengths: [String],
    areasForImprovement: [String],
    whatWentWell: String,
    challenges: String,
    suggestions: String,
    additionalComments: String
  },
  structuredFeedback: {
    categories: [{
      name: String,
      rating: Number,
      comment: String
    }],
    criteria: [{
      name: String,
      met: Boolean,
      comment: String
    }]
  },
  quantitativeMetrics: {
    tasksCompleted: Number,
    hoursLogged: Number,
    meetingsAttended: Number,
    deadlinesMet: Number,
    qualityScore: { type: Number, min: 0, max: 100 }
  },
  outcomes: {
    wouldRecommend: { type: Boolean, required: true },
    wouldWorkAgain: Boolean,
    likelihoodOfHiring: { type: Number, min: 1, max: 10 },
    contributedToGrowth: Boolean,
    metExpectations: {
      type: String,
      enum: ['exceeded', 'met', 'partially_met', 'did_not_meet']
    }
  },
  futureOpportunities: {
    interestedInFuture: Boolean,
    recommendedRoles: [String],
    potentialProjects: [String]
  },
  aiAnalysis: {
    sentiment: { type: Number, min: -1, max: 1 },
    keyPhrases: [String],
    summary: String,
    recommendations: [String],
    biasScore: { type: Number, min: 0, max: 1 },
    flaggedContent: [String]
  },
  visibility: {
    public: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    showToOthers: { type: Boolean, default: true }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'acknowledged', 'disputed', 'resolved'],
    default: 'submitted'
  },
  dispute: {
    reason: String,
    explanation: String,
    evidence: [String],
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'] },
    resolution: String,
    resolvedAt: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    timeSpent: Number,
    device: String,
    location: String
  },
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
studentCompanyFeedbackSchema.index({ relationshipId: 1, feedbackType: 1 });
studentCompanyFeedbackSchema.index({ studentId: 1, companyId: 1 });
studentCompanyFeedbackSchema.index({ 'ratings.overall': -1 });
studentCompanyFeedbackSchema.index({ submittedAt: -1 });

// Methods
studentCompanyFeedbackSchema.methods.acknowledge = function() {
  this.status = 'acknowledged';
};

studentCompanyFeedbackSchema.methods.dispute = function(reason, explanation, evidence = []) {
  this.status = 'disputed';
  this.dispute = {
    reason,
    explanation,
    evidence,
    status: 'pending'
  };
};

studentCompanyFeedbackSchema.methods.resolveDispute = function(resolution) {
  this.status = 'resolved';
  if (this.dispute) {
    this.dispute.status = 'resolved';
    this.dispute.resolution = resolution;
    this.dispute.resolvedAt = new Date();
  }
};

studentCompanyFeedbackSchema.methods.calculateAverageRating = function() {
  const ratingValues = Object.values(this.ratings).filter(v => typeof v === 'number');
  const sum = ratingValues.reduce((a, b) => a + b, 0);
  return ratingValues.length > 0 ? sum / ratingValues.length : 0;
};

// Statics
studentCompanyFeedbackSchema.statics.getFeedbackForCompany = function(companyId, limit = 50) {
  return this.find({ 
    companyId, 
    status: 'submitted',
    'visibility.public': true 
  })
    .populate('studentId', 'name profile')
    .sort('-submittedAt')
    .limit(limit);
};

studentCompanyFeedbackSchema.statics.getFeedbackForStudent = function(studentId, limit = 50) {
  return this.find({ 
    studentId, 
    status: 'submitted' 
  })
    .populate('companyId', 'name logo industry')
    .sort('-submittedAt')
    .limit(limit);
};

studentCompanyFeedbackSchema.statics.calculateCompanyRating = function(companyId) {
  return this.aggregate([
    { $match: { 
      companyId: mongoose.Types.ObjectId(companyId),
      status: 'submitted'
    }},
    { $group: {
      _id: null,
      averageOverall: { $avg: '$ratings.overall' },
      averageCommunication: { $avg: '$ratings.communication' },
      averageQuality: { $avg: '$ratings.qualityOfWork' },
      totalFeedback: { $sum: 1 },
      recommendationRate: { 
        $avg: { $cond: ['$outcomes.wouldRecommend', 1, 0] }
      }
    }}
  ]);
};

studentCompanyFeedbackSchema.statics.generateInsights = function(companyId) {
  return this.aggregate([
    { $match: { companyId: mongoose.Types.ObjectId(companyId) } },
    { $group: {
      _id: {
        $dateToString: { format: '%Y-%m', date: '$submittedAt' }
      },
      avgRating: { $avg: '$ratings.overall' },
      count: { $sum: 1 },
      positiveKeywords: { $push: '$feedback.strengths' }
    }},
    { $sort: { _id: -1 } },
    { $limit: 12 }
  ]);
};

const StudentCompanyFeedback = mongoose.model('StudentCompanyFeedback', studentCompanyFeedbackSchema);

module.exports = StudentCompanyFeedback;