// @ts-nocheck
const StudentCompanyInteraction = require('../models/StudentCompanyInteraction');
const StudentCompany = require('../models/StudentCompany');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');

// @desc    Create new interaction
// @route   POST /api/interactions
// @access  Private
exports.createInteraction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { relationshipId, type, content, scheduledFor, ...rest } = req.body;

    // Verify relationship exists
    const relationship = await StudentCompany.findById(relationshipId);
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
        message: 'Not authorized to create interaction for this relationship'
      });
    }

    // Analyze sentiment if it's a message or feedback
    let sentiment = null;
    if (type === 'message' || type === 'feedback') {
      sentiment = await aiService.analyzeSentiment(content.text);
    }

    const interaction = new StudentCompanyInteraction({
      relationshipId,
      studentId: relationship.studentId,
      companyId: relationship.companyId,
      type,
      content,
      scheduledFor,
      initiatedBy: {
        type: req.user.role,
        userId: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      participants: [
        { type: 'student', userId: relationship.studentId },
        { type: 'company', userId: relationship.companyId }
      ],
      sentiment,
      ...rest
    });

    await interaction.save();

    // Add to relationship interactions array
    relationship.addInteraction({
      type,
      description: content.text,
      initiatedBy: req.user.role
    });
    await relationship.save();

    // Send notifications
    const recipientId = req.user.role === 'student' 
      ? relationship.companyId 
      : relationship.studentId;
    
    await notificationService.sendInteractionNotification({
      recipientId,
      recipientType: req.user.role === 'student' ? 'company' : 'student',
      interaction,
      relationship
    });

    logger.info(`Interaction created: ${interaction._id}`);

    res.status(201).json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Create interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating interaction',
      error: error.message
    });
  }
};

// @desc    Get interactions for a relationship
// @route   GET /api/interactions/relationship/:relationshipId
// @access  Private
exports.getRelationshipInteractions = async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { limit = 50, before, type } = req.query;

    const relationship = await StudentCompany.findById(relationshipId);
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

    const query = { relationshipId };
    if (type) query.type = type;
    if (before) query.createdAt = { $lt: new Date(before) };

    const interactions = await StudentCompanyInteraction.find(query)
      .sort('-createdAt')
      .limit(parseInt(limit))
      .populate('initiatedBy.userId', 'name email profile');

    res.json({
      success: true,
      data: interactions,
      count: interactions.length
    });
  } catch (error) {
    logger.error('Get interactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interactions',
      error: error.message
    });
  }
};

// @desc    Get interaction by ID
// @route   GET /api/interactions/:id
// @access  Private
exports.getInteractionById = async (req, res) => {
  try {
    const interaction = await StudentCompanyInteraction.findById(req.params.id)
      .populate('initiatedBy.userId', 'name email profile')
      .populate('participants.userId', 'name email profile');

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    // Check authorization
    const relationship = await StudentCompany.findById(interaction.relationshipId);
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

    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Get interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interaction',
      error: error.message
    });
  }
};

// @desc    Update interaction
// @route   PUT /api/interactions/:id
// @access  Private
exports.updateInteraction = async (req, res) => {
  try {
    const interaction = await StudentCompanyInteraction.findById(req.params.id);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    // Only the initiator can update
    if (interaction.initiatedBy.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this interaction'
      });
    }

    const updated = await StudentCompanyInteraction.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Update interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating interaction',
      error: error.message
    });
  }
};

// @desc    Delete interaction
// @route   DELETE /api/interactions/:id
// @access  Private
exports.deleteInteraction = async (req, res) => {
  try {
    const interaction = await StudentCompanyInteraction.findById(req.params.id);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    // Only initiator or admin can delete
    if (interaction.initiatedBy.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this interaction'
      });
    }

    await interaction.remove();

    logger.info(`Interaction deleted: ${interaction._id}`);

    res.json({
      success: true,
      message: 'Interaction deleted successfully'
    });
  } catch (error) {
    logger.error('Delete interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting interaction',
      error: error.message
    });
  }
};

// @desc    Mark interaction as read
// @route   PATCH /api/interactions/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const interaction = await StudentCompanyInteraction.findById(req.params.id);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    // Determine user type
    const relationship = await StudentCompany.findById(interaction.relationshipId);
    const userType = relationship.studentId.toString() === req.user.id ? 'student' : 'company';

    interaction.markAsRead(userType, req.user.id);
    await interaction.save();

    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking interaction as read',
      error: error.message
    });
  }
};

// @desc    Get upcoming interactions
// @route   GET /api/interactions/upcoming
// @access  Private
exports.getUpcomingInteractions = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user.id;

    let companyId = null, studentId = null;
    
    if (req.user.role === 'company') {
      companyId = userId;
    } else if (req.user.role === 'student') {
      studentId = userId;
    }

    const query = {};
    if (companyId) query.companyId = companyId;
    if (studentId) query.studentId = studentId;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    const interactions = await StudentCompanyInteraction.find({
      ...query,
      scheduledFor: { $gte: startDate, $lte: endDate },
      status: 'scheduled'
    })
      .sort('scheduledFor')
      .populate('studentId', 'name email')
      .populate('companyId', 'name logo');

    res.json({
      success: true,
      data: interactions
    });
  } catch (error) {
    logger.error('Get upcoming interactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming interactions',
      error: error.message
    });
  }
};

// @desc    Complete interaction
// @route   PATCH /api/interactions/:id/complete
// @access  Private
exports.completeInteraction = async (req, res) => {
  try {
    const { metadata } = req.body;
    const interaction = await StudentCompanyInteraction.findById(req.params.id);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found'
      });
    }

    interaction.complete({ metadata });
    await interaction.save();

    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Complete interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing interaction',
      error: error.message
    });
  }
};

// @desc    Get interaction timeline
// @route   GET /api/interactions/timeline/:relationshipId
// @access  Private
exports.getTimeline = async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { limit = 50 } = req.query;

    const interactions = await StudentCompanyInteraction.getTimeline(relationshipId, parseInt(limit));

    res.json({
      success: true,
      data: interactions
    });
  } catch (error) {
    logger.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timeline',
      error: error.message
    });
  }
};

// @desc    Get communication patterns
// @route   GET /api/interactions/patterns/:relationshipId
// @access  Private
exports.getCommunicationPatterns = async (req, res) => {
  try {
    const { relationshipId } = req.params;

    const patterns = await StudentCompanyInteraction.analyzeCommunicationPatterns(relationshipId);

    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    logger.error('Get communication patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching communication patterns',
      error: error.message
    });
  }
};