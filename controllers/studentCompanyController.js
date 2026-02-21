// @ts-nocheck
const StudentCompany = require('../models/StudentCompany');
const StudentCompanyInteraction = require('../models/StudentCompanyInteraction');
const StudentCompanyCollaboration = require('../models/StudentCompanyCollaboration');
const StudentCompanyFeedback = require('../models/StudentCompanyFeedback');
const Student = require('../models/Student');
const Company = require('../models/Company');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');

// @desc    Create new student-company relationship
// @route   POST /api/student-company
// @access  Private
exports.createRelationship = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, companyId, relationshipType, ...rest } = req.body;

    // Check if relationship already exists
    const existing = await StudentCompany.findOne({
      studentId,
      companyId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Relationship already exists'
      });
    }

    // Verify student and company exist
    const [student, company] = await Promise.all([
      Student.findById(studentId),
      Company.findById(companyId)
    ]);

    if (!student || !company) {
      return res.status(404).json({
        success: false,
        message: 'Student or company not found'
      });
    }

    // Calculate initial match score using AI
    const matchScore = await aiService.calculateMatchScore({
      student,
      company,
      relationshipType
    });

    const relationship = new StudentCompany({
      studentId,
      companyId,
      relationshipType,
      matchScore: matchScore.overall,
      matchDetails: matchScore.details,
      createdBy: req.user.role,
      ...rest
    });

    await relationship.save();

    // Create initial interaction
    await StudentCompanyInteraction.create({
      relationshipId: relationship._id,
      studentId,
      companyId,
      type: 'introduction',
      initiatedBy: { type: 'system' },
      content: {
        text: `Relationship initiated by ${req.user.role}`
      },
      participants: [
        { type: 'student', userId: studentId },
        { type: 'company', userId: companyId }
      ]
    });

    logger.info(`Student-company relationship created: ${relationship._id}`);

    res.status(201).json({
      success: true,
      data: relationship
    });
  } catch (error) {
    logger.error('Create relationship error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating relationship',
      error: error.message
    });
  }
};

// @desc    Get all relationships
// @route   GET /api/student-company
// @access  Private/Admin
exports.getAllRelationships = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      relationshipType,
      studentId,
      companyId,
      sortBy = '-createdAt'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (relationshipType) query.relationshipType = relationshipType;
    if (studentId) query.studentId = studentId;
    if (companyId) query.companyId = companyId;

    const relationships = await StudentCompany.find(query)
      .populate('studentId', 'name email profile skills education')
      .populate('companyId', 'name industry logo location size')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StudentCompany.countDocuments(query);

    res.json({
      success: true,
      data: relationships,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get relationships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching relationships',
      error: error.message
    });
  }
};

// @desc    Get relationship by ID
// @route   GET /api/student-company/:id
// @access  Private
exports.getRelationshipById = async (req, res) => {
  try {
    const relationship = await StudentCompany.findById(req.params.id)
      .populate('studentId', 'name email profile skills education experience')
      .populate('companyId', 'name industry logo description location size culture')
      .populate('interactions')
      .populate('milestones');

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      relationship.studentId._id.toString() === req.user.id ||
      relationship.companyId._id.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this relationship'
      });
    }

    res.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    logger.error('Get relationship error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching relationship',
      error: error.message
    });
  }
};

// @desc    Update relationship
// @route   PUT /api/student-company/:id
// @access  Private
exports.updateRelationship = async (req, res) => {
  try {
    const relationship = await StudentCompany.findById(req.params.id);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      relationship.studentId.toString() === req.user.id ||
      relationship.companyId.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this relationship'
      });
    }

    const updated = await StudentCompany.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    logger.info(`Relationship updated: ${relationship._id}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Update relationship error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating relationship',
      error: error.message
    });
  }
};

// @desc    Delete relationship
// @route   DELETE /api/student-company/:id
// @access  Private/Admin
exports.deleteRelationship = async (req, res) => {
  try {
    const relationship = await StudentCompany.findById(req.params.id);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Delete all related data
    await Promise.all([
      StudentCompanyInteraction.deleteMany({ relationshipId: relationship._id }),
      StudentCompanyCollaboration.deleteMany({ relationshipId: relationship._id }),
      StudentCompanyFeedback.deleteMany({ relationshipId: relationship._id }),
      relationship.remove()
    ]);

    logger.info(`Relationship deleted: ${relationship._id}`);

    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
  } catch (error) {
    logger.error('Delete relationship error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting relationship',
      error: error.message
    });
  }
};

// @desc    Get student's relationships
// @route   GET /api/student-company/student/:studentId
// @access  Private
exports.getStudentRelationships = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    // Check authorization
    if (req.user.id !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const relationships = await StudentCompany.findByStudent(studentId, status);

    res.json({
      success: true,
      data: relationships
    });
  } catch (error) {
    logger.error('Get student relationships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student relationships',
      error: error.message
    });
  }
};

// @desc    Get company's relationships
// @route   GET /api/student-company/company/:companyId
// @access  Private
exports.getCompanyRelationships = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    // Check authorization
    if (req.user.id !== companyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const relationships = await StudentCompany.findByCompany(companyId, status);

    res.json({
      success: true,
      data: relationships
    });
  } catch (error) {
    logger.error('Get company relationships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching company relationships',
      error: error.message
    });
  }
};

// @desc    Update relationship status
// @route   PATCH /api/student-company/:id/status
// @access  Private
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const relationship = await StudentCompany.findById(req.params.id);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Check authorization
    const isAuthorized = 
      relationship.studentId.toString() === req.user.id ||
      relationship.companyId.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    relationship.status = status;
    await relationship.save();

    // Create interaction for status change
    await StudentCompanyInteraction.create({
      relationshipId: relationship._id,
      studentId: relationship.studentId,
      companyId: relationship.companyId,
      type: 'status_change',
      initiatedBy: { type: req.user.role },
      content: {
        text: `Status changed to ${status}`
      }
    });

    res.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    logger.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};

// @desc    Get relationship analytics
// @route   GET /api/student-company/analytics/dashboard
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
  try {
    const { companyId, studentId } = req.query;

    const match = {};
    if (companyId) match.companyId = companyId;
    if (studentId) match.studentId = studentId;

    const [
      totalRelationships,
      activeRelationships,
      completedRelationships,
      avgMatchScore,
      relationshipsByType,
      relationshipsByStatus,
      topPerforming
    ] = await Promise.all([
      StudentCompany.countDocuments(match),
      StudentCompany.countDocuments({ ...match, status: 'active' }),
      StudentCompany.countDocuments({ ...match, status: 'completed' }),
      StudentCompany.aggregate([
        { $match: match },
        { $group: { _id: null, avg: { $avg: '$matchScore' } } }
      ]),
      StudentCompany.aggregate([
        { $match: match },
        { $group: { _id: '$relationshipType', count: { $sum: 1 } } }
      ]),
      StudentCompany.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      StudentCompany.find(match)
        .sort('-matchScore')
        .limit(10)
        .populate('studentId', 'name')
        .populate('companyId', 'name')
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalRelationships,
          active: activeRelationships,
          completed: completedRelationships,
          avgMatchScore: avgMatchScore[0]?.avg || 0
        },
        byType: relationshipsByType,
        byStatus: relationshipsByStatus,
        topPerforming
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};