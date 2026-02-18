const BusinessModel = require('../models/BusinessModel');

// @desc    Create business model
// @route   POST /api/business-models
// @access  Private/Company
exports.createBusinessModel = async (req, res) => {
  try {
    const {
      type,
      revenueStreams,
      customerSegments,
      valueProposition,
      channels,
      customerRelationships,
      keyActivities,
      keyResources,
      keyPartners,
      costStructure
    } = req.body;
    
    // Check if business model already exists for company
    const existing = await BusinessModel.findOne({ company: req.user.companyId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Business model already exists for this company'
      });
    }
    
    const businessModel = await BusinessModel.create({
      company: req.user.companyId,
      type,
      revenueStreams,
      customerSegments,
      valueProposition,
      channels,
      customerRelationships,
      keyActivities,
      keyResources,
      keyPartners,
      costStructure
    });
    
    res.status(201).json({
      success: true,
      message: 'Business model created successfully',
      data: businessModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating business model',
      error: error.message
    });
  }
};

// @desc    Get company's business model
// @route   GET /api/business-models/company/:companyId
// @access  Public
exports.getCompanyBusinessModel = async (req, res) => {
  try {
    const businessModel = await BusinessModel.findOne({ 
      company: req.params.companyId 
    });
    
    if (!businessModel) {
      return res.status(404).json({
        success: false,
        message: 'Business model not found'
      });
    }
    
    res.json({
      success: true,
      data: businessModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching business model',
      error: error.message
    });
  }
};

// @desc    Update business model
// @route   PUT /api/business-models/:id
// @access  Private/Company
exports.updateBusinessModel = async (req, res) => {
  try {
    const businessModel = await BusinessModel.findById(req.params.id);
    
    if (!businessModel) {
      return res.status(404).json({
        success: false,
        message: 'Business model not found'
      });
    }
    
    // Check authorization
    if (businessModel.company.toString() !== req.user.companyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this business model'
      });
    }
    
    const updatedModel = await BusinessModel.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Business model updated successfully',
      data: updatedModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating business model',
      error: error.message
    });
  }
};

// @desc    Delete business model
// @route   DELETE /api/business-models/:id
// @access  Private/Admin
exports.deleteBusinessModel = async (req, res) => {
  try {
    const businessModel = await BusinessModel.findById(req.params.id);
    
    if (!businessModel) {
      return res.status(404).json({
        success: false,
        message: 'Business model not found'
      });
    }
    
    await businessModel.deleteOne();
    
    res.json({
      success: true,
      message: 'Business model deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting business model',
      error: error.message
    });
  }
};