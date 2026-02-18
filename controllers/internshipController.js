const Internship = require('../models/Internship');
const Company = require('../models/Company');
const Application = require('../models/Application');
const SavedItem = require('../models/SavedItem');

// @desc    Create internship
// @route   POST /api/internships
// @access  Private/Company
exports.createInternship = async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user.id });
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found'
      });
    }
    
    if (company.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Company must be approved to post internships'
      });
    }
    
    const internship = await Internship.create({
      ...req.body,
      company: company._id,
      postedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Internship posted successfully',
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating internship',
      error: error.message
    });
  }
};

// @desc    Get all internships
// @route   GET /api/internships
// @access  Public
exports.getInternships = async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      duration,
      stipend,
      skills,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;
    
    let query = { status: 'active' };
    
    if (title) query.title = { $regex: title, $options: 'i' };
    if (company) query.company = company;
    if (location) query['location.city'] = { $regex: location, $options: 'i' };
    if (type) query.type = type;
    if (duration) query['duration.months'] = { $lte: parseInt(duration) };
    if (skills) query.skills = { $in: skills.split(',') };
    
    if (stipend) {
      const [min, max] = stipend.split('-');
      query['stipend.amount'] = { $gte: parseInt(min) };
      if (max) query['stipend.amount'] = { ...query['stipend.amount'], $lte: parseInt(max) };
    }
    
    const internships = await Internship.find(query)
      .populate('company', 'name logo industry')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });
    
    const total = await Internship.countDocuments(query);
    
    res.json({
      success: true,
      data: internships,
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
      message: 'Error fetching internships',
      error: error.message
    });
  }
};

// @desc    Get internship by ID
// @route   GET /api/internships/:id
// @access  Public
exports.getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name logo description industry website')
      .populate('postedBy', 'firstName lastName');
    
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Increment views
    internship.views += 1;
    await internship.save();
    
    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching internship',
      error: error.message
    });
  }
};

// @desc    Update internship
// @route   PUT /api/internships/:id
// @access  Private/Company
exports.updateInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Check authorization
    const company = await Company.findOne({ user: req.user.id });
    if (internship.company.toString() !== company._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this internship'
      });
    }
    
    const updatedInternship = await Internship.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Internship updated successfully',
      data: updatedInternship
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating internship',
      error: error.message
    });
  }
};

// @desc    Delete internship
// @route   DELETE /api/internships/:id
// @access  Private/Company
exports.deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Check authorization
    const company = await Company.findOne({ user: req.user.id });
    if (internship.company.toString() !== company._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this internship'
      });
    }
    
    // Delete related applications
    await Application.deleteMany({ internship: internship._id });
    
    await internship.deleteOne();
    
    res.json({
      success: true,
      message: 'Internship deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting internship',
      error: error.message
    });
  }
};

// @desc    Apply for internship
// @route   POST /api/internships/:id/apply
// @access  Private/Student
exports.applyForInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    if (internship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This internship is no longer accepting applications'
      });
    }
    
    // Check if already applied
    const existingApplication = await Application.findOne({
      internship: internship._id,
      student: req.user.studentId
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this internship'
      });
    }
    
    const application = await Application.create({
      internship: internship._id,
      student: req.user.studentId,
      coverLetter: req.body.coverLetter,
      resume: req.body.resume,
      answers: req.body.answers
    });
    
    // Increment applications count
    internship.applications += 1;
    await internship.save();
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying for internship',
      error: error.message
    });
  }
};

// @desc    Save internship
// @route   POST /api/internships/:id/save
// @access  Private
exports.saveInternship = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    
    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Check if already saved
    const existingSaved = await SavedItem.findOne({
      user: req.user.id,
      item: internship._id,
      itemType: 'Internship'
    });
    
    if (existingSaved) {
      return res.status(400).json({
        success: false,
        message: 'Internship already saved'
      });
    }
    
    await SavedItem.create({
      user: req.user.id,
      item: internship._id,
      itemType: 'Internship'
    });
    
    res.json({
      success: true,
      message: 'Internship saved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving internship',
      error: error.message
    });
  }
};

// @desc    Unsave internship
// @route   DELETE /api/internships/:id/save
// @access  Private
exports.unsaveInternship = async (req, res) => {
  try {
    const saved = await SavedItem.findOneAndDelete({
      user: req.user.id,
      item: req.params.id,
      itemType: 'Internship'
    });
    
    if (!saved) {
      return res.status(400).json({
        success: false,
        message: 'Internship not saved'
      });
    }
    
    res.json({
      success: true,
      message: 'Internship removed from saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing saved internship',
      error: error.message
    });
  }
};