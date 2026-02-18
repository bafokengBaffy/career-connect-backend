const Education = require('../models/Education');
const Institution = require('../models/Institution');

// @desc    Create education entry
// @route   POST /api/education
// @access  Private
exports.createEducation = async (req, res) => {
  try {
    const {
      institution,
      degree,
      fieldOfStudy,
      startDate,
      endDate,
      current,
      grade,
      activities,
      description
    } = req.body;
    
    // Verify institution exists
    const institutionExists = await Institution.findById(institution);
    if (!institutionExists) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }
    
    const education = await Education.create({
      user: req.user.id,
      institution,
      degree,
      fieldOfStudy,
      startDate,
      endDate: current ? null : endDate,
      current,
      grade,
      activities,
      description
    });
    
    res.status(201).json({
      success: true,
      message: 'Education entry created successfully',
      data: education
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating education entry',
      error: error.message
    });
  }
};

// @desc    Get user's education
// @route   GET /api/education/user/:userId
// @access  Public
exports.getUserEducation = async (req, res) => {
  try {
    const education = await Education.find({ user: req.params.userId })
      .populate('institution')
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      data: education
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching education',
      error: error.message
    });
  }
};

// @desc    Update education
// @route   PUT /api/education/:id
// @access  Private
exports.updateEducation = async (req, res) => {
  try {
    const education = await Education.findById(req.params.id);
    
    if (!education) {
      return res.status(404).json({
        success: false,
        message: 'Education entry not found'
      });
    }
    
    // Check ownership
    if (education.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this entry'
      });
    }
    
    const updatedEducation = await Education.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Education entry updated successfully',
      data: updatedEducation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating education entry',
      error: error.message
    });
  }
};

// @desc    Delete education
// @route   DELETE /api/education/:id
// @access  Private
exports.deleteEducation = async (req, res) => {
  try {
    const education = await Education.findById(req.params.id);
    
    if (!education) {
      return res.status(404).json({
        success: false,
        message: 'Education entry not found'
      });
    }
    
    // Check ownership
    if (education.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this entry'
      });
    }
    
    await education.deleteOne();
    
    res.json({
      success: true,
      message: 'Education entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting education entry',
      error: error.message
    });
  }
};