const Competition = require('../models/Competition');

// @desc    Create competition entry
// @route   POST /api/competitions
// @access  Private/Company
exports.createCompetition = async (req, res) => {
  try {
    const {
      name,
      description,
      strengths,
      weaknesses,
      marketShare,
      products,
      pricing,
      location
    } = req.body;
    
    const competition = await Competition.create({
      company: req.user.companyId,
      name,
      description,
      strengths,
      weaknesses,
      marketShare,
      products,
      pricing,
      location
    });
    
    res.status(201).json({
      success: true,
      message: 'Competition entry created successfully',
      data: competition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating competition entry',
      error: error.message
    });
  }
};

// @desc    Get company's competitors
// @route   GET /api/competitions/company/:companyId
// @access  Private/Company
exports.getCompanyCompetitors = async (req, res) => {
  try {
    const competitors = await Competition.find({ 
      company: req.params.companyId 
    }).sort({ marketShare: -1 });
    
    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching competitors',
      error: error.message
    });
  }
};

// @desc    Update competition entry
// @route   PUT /api/competitions/:id
// @access  Private/Company
exports.updateCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition entry not found'
      });
    }
    
    // Check authorization
    if (competition.company.toString() !== req.user.companyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this entry'
      });
    }
    
    const updatedCompetition = await Competition.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Competition entry updated successfully',
      data: updatedCompetition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating competition entry',
      error: error.message
    });
  }
};

// @desc    Delete competition entry
// @route   DELETE /api/competitions/:id
// @access  Private/Company
exports.deleteCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    
    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition entry not found'
      });
    }
    
    // Check authorization
    if (competition.company.toString() !== req.user.companyId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this entry'
      });
    }
    
    await competition.deleteOne();
    
    res.json({
      success: true,
      message: 'Competition entry deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting competition entry',
      error: error.message
    });
  }
};

// @desc    Get competitor analysis
// @route   GET /api/competitions/analysis
// @access  Private/Company
exports.getCompetitorAnalysis = async (req, res) => {
  try {
    const competitors = await Competition.find({ 
      company: req.user.companyId 
    });
    
    // Calculate market concentration
    const totalMarketShare = competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0);
    
    // Identify main competitors (top 3 by market share)
    const mainCompetitors = competitors
      .sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0))
      .slice(0, 3);
    
    // Analyze competitive landscape
    const analysis = {
      totalCompetitors: competitors.length,
      totalMarketShare,
      mainCompetitors,
      marketConcentration: totalMarketShare > 70 ? 'high' : totalMarketShare > 40 ? 'medium' : 'low',
      recommendations: []
    };
    
    // Generate recommendations
    if (competitors.length > 10) {
      analysis.recommendations.push('Market is highly competitive. Focus on differentiation.');
    }
    
    if (mainCompetitors.length > 0 && mainCompetitors[0].marketShare > 30) {
      analysis.recommendations.push('Market leader has significant share. Consider niche targeting.');
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating competitor analysis',
      error: error.message
    });
  }
};