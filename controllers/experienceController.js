const Experience = require('../models/Experience');
const Company = require('../models/Company');

// @desc    Create experience entry
// @route   POST /api/experience
// @access  Private
exports.createExperience = async (req, res) => {
  try {
    const {
      company,
      title,
      location,
      employmentType,
      startDate,
      endDate,
      current,
      description,
      achievements,
      skills
    } = req.body;
    
    // Verify company exists if provided
    if (company) {
      const companyExists = await Company.findById(company);
      if (!companyExists) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
    }
    
    const experience = await Experience.create({
      user: req.user.id,
      company,
      companyName: req.body.companyName, // For manual entry
      title,
      location,
      employmentType,
      startDate,
      endDate: current ? null : endDate,
      current,
      description,
      achievements,
      skills
    });
    
    res.status(201).json({
      success: true,
      message: 'Experience entry created successfully',
      data: experience
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating experience entry',
      error: error.message
    });
  }
};

// @desc    Get user's experience
// @route   GET /api/experience/user/:userId
// @access  Public
exports.getUserExperience = async (req, res) => {
  try {
    const experience = await Experience.find({ user: req.params.userId })
      .populate('company', 'name logo industry')
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching experience',
      error: error.message
    });
  }
};

// @desc    Update experience
// @route   PUT /api/experience/:id
// @access  Private
exports.updateExperience = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience entry not found'
      });
    }
    
    // Check ownership
    if (experience.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this entry'
      });
    }
    
    const updatedExperience = await Experience.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Experience entry updated successfully',
      data: updatedExperience
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating experience entry',
      error: error.message
    });
  }
};

// @desc    Delete experience
// @route   DELETE /api/experience/:id
// @access  Private
exports.deleteExperience = async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    
    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience entry not found'
      });
    }
    
    // Check ownership
    if (experience.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this entry'
      });
    }
    
    await experience.deleteOne();
    
    res.json({
      success: true,
      message: 'Experience entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting experience entry',
      error: error.message
    });
  }
};