const Review = require('../models/Review');
const Company = require('../models/Company');
const User = require('../models/User');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const {
      company,
      rating,
      title,
      content,
      pros,
      cons,
      isAnonymous
    } = req.body;
    
    // Check if company exists
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    // Check if user already reviewed this company
    const existingReview = await Review.findOne({
      user: req.user.id,
      company
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this company'
      });
    }
    
    const review = await Review.create({
      user: req.user.id,
      company,
      ratings: rating,
      title,
      content,
      pros,
      cons,
      isAnonymous
    });
    
    // Update company average rating
    await updateCompanyRating(company);
    
    res.status(201).json({
      success: true,
      message: 'Review posted successfully',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const {
      company,
      rating,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10
    } = req.query;
    
    let query = { status: 'approved' };
    
    if (company) query.company = company;
    if (rating) query['ratings.overall'] = { $gte: parseInt(rating) };
    
    const reviews = await Review.find(query)
      .populate('user', 'firstName lastName profilePicture')
      .populate('company', 'name logo')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });
    
    // Process anonymous reviews
    const processedReviews = reviews.map(review => {
      if (review.isAnonymous) {
        review.user = { firstName: 'Anonymous', lastName: '' };
      }
      return review;
    });
    
    const total = await Review.countDocuments(query);
    
    res.json({
      success: true,
      data: processedReviews,
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
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Public
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'firstName lastName profilePicture')
      .populate('company', 'name logo');
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Hide user info if anonymous
    if (review.isAnonymous) {
      review.user = { firstName: 'Anonymous', lastName: '' };
    }
    
    // Increment helpful count
    review.helpful.count += 1;
    await review.save();
    
    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: error.message
    });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check ownership
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }
    
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        status: req.user.role === 'admin' ? req.body.status : 'pending',
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    // Update company rating if approved
    if (updatedReview.status === 'approved') {
      await updateCompanyRating(updatedReview.company);
    }
    
    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check ownership
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    const companyId = review.company;
    await review.deleteOne();
    
    // Update company rating
    await updateCompanyRating(companyId);
    
    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if user already marked
    if (review.helpful.users.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You already marked this review as helpful'
      });
    }
    
    review.helpful.count += 1;
    review.helpful.users.push(req.user.id);
    await review.save();
    
    res.json({
      success: true,
      message: 'Review marked as helpful',
      data: { helpfulCount: review.helpful.count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking review as helpful',
      error: error.message
    });
  }
};

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if user already reported
    if (review.reports.some(r => r.user.toString() === req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You already reported this review'
      });
    }
    
    review.reports.push({
      user: req.user.id,
      reason,
      date: Date.now()
    });
    
    // Auto-flag if multiple reports
    if (review.reports.length >= 3) {
      review.status = 'flagged';
    }
    
    await review.save();
    
    res.json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reporting review',
      error: error.message
    });
  }
};

// Helper function to update company average rating
async function updateCompanyRating(companyId) {
  const stats = await Review.aggregate([
    { $match: { company: mongoose.Types.ObjectId(companyId), status: 'approved' } },
    {
      $group: {
        _id: '$company',
        avgOverall: { $avg: '$ratings.overall' },
        avgWorkLife: { $avg: '$ratings.workLifeBalance' },
        avgSalary: { $avg: '$ratings.salary' },
        avgJobSecurity: { $avg: '$ratings.jobSecurity' },
        avgManagement: { $avg: '$ratings.management' },
        avgCulture: { $avg: '$ratings.culture' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Company.findByIdAndUpdate(companyId, {
      averageRating: stats[0].avgOverall,
      totalReviews: stats[0].totalReviews,
      ratingBreakdown: {
        workLifeBalance: stats[0].avgWorkLife,
        salary: stats[0].avgSalary,
        jobSecurity: stats[0].avgJobSecurity,
        management: stats[0].avgManagement,
        culture: stats[0].avgCulture
      }
    });
  }
}