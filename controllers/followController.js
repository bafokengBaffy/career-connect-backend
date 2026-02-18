const Follow = require('../models/Follow');
const Company = require('../models/Company');
const Notification = require('../models/Notification');

// @desc    Follow company
// @route   POST /api/follow/company/:companyId
// @access  Private
exports.followCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    // Check if already following
    const existingFollow = await Follow.findOne({
      user: req.user.id,
      company: req.params.companyId
    });
    
    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this company'
      });
    }
    
    const follow = await Follow.create({
      user: req.user.id,
      company: req.params.companyId
    });
    
    // Increment followers count
    company.followers += 1;
    await company.save();
    
    // Create notification for company
    await Notification.create({
      recipient: company.user,
      type: 'new_follower',
      title: 'New Follower',
      message: 'Someone started following your company',
      data: {
        companyId: company._id,
        followId: follow._id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Company followed successfully',
      data: follow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error following company',
      error: error.message
    });
  }
};

// @desc    Unfollow company
// @route   DELETE /api/follow/company/:companyId
// @access  Private
exports.unfollowCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    const follow = await Follow.findOneAndDelete({
      user: req.user.id,
      company: req.params.companyId
    });
    
    if (!follow) {
      return res.status(400).json({
        success: false,
        message: 'Not following this company'
      });
    }
    
    // Decrement followers count
    company.followers -= 1;
    await company.save();
    
    res.json({
      success: true,
      message: 'Company unfollowed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unfollowing company',
      error: error.message
    });
  }
};

// @desc    Get user's followed companies
// @route   GET /api/follow/companies
// @access  Private
exports.getFollowedCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const follows = await Follow.find({ user: req.user.id })
      .populate('company')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Follow.countDocuments({ user: req.user.id });
    
    res.json({
      success: true,
      data: follows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching followed companies',
      error: error.message
    });
  }
};

// @desc    Check if following company
// @route   GET /api/follow/check/:companyId
// @access  Private
exports.checkFollowing = async (req, res) => {
  try {
    const follow = await Follow.findOne({
      user: req.user.id,
      company: req.params.companyId
    });
    
    res.json({
      success: true,
      data: {
        isFollowing: !!follow,
        followId: follow?._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking follow status',
      error: error.message
    });
  }
};

// @desc    Get company followers
// @route   GET /api/follow/company/:companyId/followers
// @access  Private/Company
exports.getCompanyFollowers = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    // Check authorization
    if (company.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view followers'
      });
    }
    
    const followers = await Follow.find({ company: req.params.companyId })
      .populate({
        path: 'user',
        select: 'firstName lastName email profilePicture'
      })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: followers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching followers',
      error: error.message
    });
  }
};