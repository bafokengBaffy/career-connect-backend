const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const SavedItem = require('../models/SavedItem');

// @desc    Create job
// @route   POST /api/jobs
// @access  Private/Company
exports.createJob = async (req, res) => {
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
        message: 'Company must be approved to post jobs'
      });
    }
    
    const job = await Job.create({
      ...req.body,
      company: company._id,
      postedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating job',
      error: error.message
    });
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
exports.getJobs = async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      experience,
      salary,
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
    if (experience) query['experience.min'] = { $lte: parseInt(experience) };
    if (skills) query.skills = { $in: skills.split(',') };
    
    if (salary) {
      const [min, max] = salary.split('-');
      query['salary.min'] = { $gte: parseInt(min) };
      if (max) query['salary.max'] = { $lte: parseInt(max) };
    }
    
    const jobs = await Job.find(query)
      .populate('company', 'name logo industry')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 });
    
    const total = await Job.countDocuments(query);
    
    res.json({
      success: true,
      data: jobs,
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
      message: 'Error fetching jobs',
      error: error.message
    });
  }
};

// @desc    Get job by ID
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name logo description industry website')
      .populate('postedBy', 'firstName lastName');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Increment views
    job.views += 1;
    await job.save();
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private/Company
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check authorization
    const company = await Company.findOne({ user: req.user.id });
    if (job.company.toString() !== company._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }
    
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private/Company
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check authorization
    const company = await Company.findOne({ user: req.user.id });
    if (job.company.toString() !== company._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }
    
    // Delete related applications
    await Application.deleteMany({ job: job._id });
    
    await job.deleteOne();
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message
    });
  }
};

// @desc    Get job applications
// @route   GET /api/jobs/:id/applications
// @access  Private/Company
exports.getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check authorization
    const company = await Company.findOne({ user: req.user.id });
    if (job.company.toString() !== company._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these applications'
      });
    }
    
    const applications = await Application.find({ job: job._id })
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName email profilePicture'
        }
      })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Apply for job
// @route   POST /api/jobs/:id/apply
// @access  Private/Student
exports.applyForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }
    
    // Check if already applied
    const existingApplication = await Application.findOne({
      job: job._id,
      student: req.user.studentId
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    
    const application = await Application.create({
      job: job._id,
      student: req.user.studentId,
      coverLetter: req.body.coverLetter,
      resume: req.body.resume,
      answers: req.body.answers
    });
    
    // Increment applications count
    job.applications += 1;
    await job.save();
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying for job',
      error: error.message
    });
  }
};

// @desc    Save job
// @route   POST /api/jobs/:id/save
// @access  Private
exports.saveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check if already saved
    const existingSaved = await SavedItem.findOne({
      user: req.user.id,
      item: job._id,
      itemType: 'Job'
    });
    
    if (existingSaved) {
      return res.status(400).json({
        success: false,
        message: 'Job already saved'
      });
    }
    
    await SavedItem.create({
      user: req.user.id,
      item: job._id,
      itemType: 'Job'
    });
    
    res.json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving job',
      error: error.message
    });
  }
};

// @desc    Unsave job
// @route   DELETE /api/jobs/:id/save
// @access  Private
exports.unsaveJob = async (req, res) => {
  try {
    const saved = await SavedItem.findOneAndDelete({
      user: req.user.id,
      item: req.params.id,
      itemType: 'Job'
    });
    
    if (!saved) {
      return res.status(400).json({
        success: false,
        message: 'Job not saved'
      });
    }
    
    res.json({
      success: true,
      message: 'Job removed from saved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing saved job',
      error: error.message
    });
  }
};

// @desc    Get similar jobs
// @route   GET /api/jobs/:id/similar
// @access  Public
exports.getSimilarJobs = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    const similarJobs = await Job.find({
      _id: { $ne: job._id },
      status: 'active',
      $or: [
        { title: { $regex: job.title.split(' ').slice(0, 2).join('|'), $options: 'i' } },
        { skills: { $in: job.skills } },
        { type: job.type }
      ]
    })
      .populate('company', 'name logo')
      .limit(5);
    
    res.json({
      success: true,
      data: similarJobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching similar jobs',
      error: error.message
    });
  }
};

// @desc    Get job statistics
// @route   GET /api/jobs/statistics
// @access  Private/Admin
exports.getJobStatistics = async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgApplications: { $avg: '$applications' },
          avgViews: { $avg: '$views' }
        }
      }
    ]);
    
    const total = await Job.countDocuments();
    const active = await Job.countDocuments({ status: 'active' });
    
    res.json({
      success: true,
      data: {
        byType: stats,
        total,
        active
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching job statistics',
      error: error.message
    });
  }
};