// @ts-nocheck
const StudentCompanyMatch = require('../models/StudentCompanyMatch');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const aiService = require('../services/studentCompanyMatchingService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// @desc    Get matches for a student
// @route   GET /api/matching/student/:studentId
// @access  Private
exports.getStudentMatches = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 20, minScore = 0, type } = req.query;

    // Check authorization
    if (req.user.id !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get or generate matches
    let matches = await StudentCompanyMatch.findTopMatchesForStudent(studentId, parseInt(limit));
    
    if (matches.length === 0 || req.query.refresh === 'true') {
      // Generate new matches using AI
      matches = await aiService.findMatchesForStudent(student, {
        limit: parseInt(limit),
        minScore: parseInt(minScore),
        type
      });
    }

    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    logger.error('Get student matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
      error: error.message
    });
  }
};

// @desc    Get matches for a company
// @route   GET /api/matching/company/:companyId
// @access  Private
exports.getCompanyMatches = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit = 20, minScore = 0, jobId, internshipId } = req.query;

    // Check authorization
    if (req.user.id !== companyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    let matches = await StudentCompanyMatch.findTopCandidatesForCompany(companyId, parseInt(limit));

    if (matches.length === 0 || req.query.refresh === 'true') {
      // Generate new matches using AI
      matches = await aiService.findCandidatesForCompany(company, {
        limit: parseInt(limit),
        minScore: parseInt(minScore),
        jobId,
        internshipId
      });
    }

    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    logger.error('Get company matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matches',
      error: error.message
    });
  }
};

// @desc    Get match by ID
// @route   GET /api/matching/:id
// @access  Private
exports.getMatchById = async (req, res) => {
  try {
    const match = await StudentCompanyMatch.findById(req.params.id)
      .populate('studentId', 'name email profile skills education experience')
      .populate('companyId', 'name industry logo description culture values');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      match.studentId._id.toString() === req.user.id ||
      match.companyId._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match',
      error: error.message
    });
  }
};

// @desc    Update match status
// @route   PATCH /api/matching/:id/status
// @access  Private
exports.updateMatchStatus = async (req, res) => {
  try {
    const { status, metadata } = req.body;
    const match = await StudentCompanyMatch.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Determine who performed the action
    const performedBy = req.user.role === 'student' ? 'student' : 
                       req.user.role === 'company' ? 'company' : 'system';

    match.updateStatus(status, performedBy, metadata);
    await match.save();

    logger.info(`Match ${match._id} status updated to ${status}`);

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    logger.error('Update match status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating match status',
      error: error.message
    });
  }
};

// @desc    Get match breakdown
// @route   GET /api/matching/:id/breakdown
// @access  Private
exports.getMatchBreakdown = async (req, res) => {
  try {
    const match = await StudentCompanyMatch.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const breakdown = match.getMatchBreakdown();

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    logger.error('Get match breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match breakdown',
      error: error.message
    });
  }
};

// @desc    Get match statistics
// @route   GET /api/matching/stats
// @access  Private/Admin
exports.getMatchStats = async (req, res) => {
  try {
    const { companyId, studentId } = req.query;

    const stats = await StudentCompanyMatch.aggregate([
      {
        $match: {
          ...(companyId && { companyId: mongoose.Types.ObjectId(companyId) }),
          ...(studentId && { studentId: mongoose.Types.ObjectId(studentId) })
        }
      },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          avgScore: { $avg: '$matchScore' },
          maxScore: { $max: '$matchScore' },
          minScore: { $min: '$matchScore' },
          viewedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'viewed'] }, 1, 0] }
          },
          shortlistedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] }
          },
          contactedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
          },
          acceptedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalMatches: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        viewedCount: 0,
        shortlistedCount: 0,
        contactedCount: 0,
        acceptedCount: 0,
        rejectedCount: 0
      }
    });
  } catch (error) {
    logger.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching match statistics',
      error: error.message
    });
  }
};

// @desc    Get match recommendations
// @route   POST /api/matching/recommendations
// @access  Private
exports.getRecommendations = async (req, res) => {
  try {
    const { studentId, companyId, criteria } = req.body;

    if (!studentId && !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Either studentId or companyId is required'
      });
    }

    let recommendations;

    if (studentId) {
      const student = await Student.findById(studentId);
      recommendations = await aiService.getPersonalizedRecommendations(student, criteria);
    } else {
      const company = await Company.findById(companyId);
      recommendations = await aiService.getCompanyRecommendations(company, criteria);
    }

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};

// @desc    Batch generate matches
// @route   POST /api/matching/batch
// @access  Private/Admin
exports.batchGenerateMatches = async (req, res) => {
  try {
    const { companyIds, studentIds, type } = req.body;

    const results = await aiService.batchMatchGeneration({
      companyIds,
      studentIds,
      type
    });

    logger.info(`Batch match generation completed: ${results.total} matches created`);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Batch match generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating batch matches',
      error: error.message
    });
  }
};

// @desc    Get match quality metrics
// @route   GET /api/matching/quality/:matchId
// @access  Private
exports.getMatchQuality = async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await StudentCompanyMatch.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const qualityMetrics = await aiService.assessMatchQuality(match);

    res.json({
      success: true,
      data: qualityMetrics
    });
  } catch (error) {
    logger.error('Get match quality error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assessing match quality',
      error: error.message
    });
  }
};