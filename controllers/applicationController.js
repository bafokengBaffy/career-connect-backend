const Application = require('../models/Application');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private/Admin
exports.getApplications = async (req, res) => {
  try {
    const {
      status,
      job,
      internship,
      student,
      page = 1,
      limit = 10
    } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (job) query.job = job;
    if (internship) query.internship = internship;
    if (student) query.student = student;
    
    const applications = await Application.find(query)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName email profilePicture'
        }
      })
      .populate('job')
      .populate('internship')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Application.countDocuments(query);
    
    res.json({
      success: true,
      data: applications,
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
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Get application by ID
// @route   GET /api/applications/:id
// @access  Private
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName email profilePicture phone location'
        }
      })
      .populate('job')
      .populate('internship')
      .populate('reviewedBy', 'firstName lastName');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check authorization
    const student = await Student.findOne({ user: req.user.id });
    const isStudent = student && application.student.toString() === student._id.toString();
    const isCompany = application.job || application.internship;
    const isAdmin = req.user.role === 'admin';
    
    if (!isStudent && !isCompany && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private/Company
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, feedback } = req.body;
    
    const application = await Application.findById(req.params.id)
      .populate('student')
      .populate('job')
      .populate('internship');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    application.status = status;
    application.reviewedAt = Date.now();
    application.reviewedBy = req.user.id;
    application.feedback = feedback;
    
    await application.save();
    
    // Create notification for student
    await Notification.create({
      recipient: application.student.user,
      type: 'application_update',
      title: 'Application Status Updated',
      message: `Your application status has been updated to ${status}`,
      data: {
        applicationId: application._id,
        status
      }
    });
    
    res.json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating application',
      error: error.message
    });
  }
};

// @desc    Schedule interview
// @route   POST /api/applications/:id/interview
// @access  Private/Company
exports.scheduleInterview = async (req, res) => {
  try {
    const { date, time, duration, type, location, notes } = req.body;
    
    const application = await Application.findById(req.params.id)
      .populate('student');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    application.interview = {
      scheduled: true,
      date,
      time,
      duration,
      type,
      location,
      notes,
      status: 'scheduled'
    };
    
    await application.save();
    
    // Create notification for student
    await Notification.create({
      recipient: application.student.user,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `An interview has been scheduled for ${date} at ${time}`,
      data: {
        applicationId: application._id,
        interview: application.interview
      }
    });
    
    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application.interview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

// @desc    Update interview status
// @route   PUT /api/applications/:id/interview
// @access  Private
exports.updateInterviewStatus = async (req, res) => {
  try {
    const { status, feedback } = req.body;
    
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    if (!application.interview) {
      return res.status(400).json({
        success: false,
        message: 'No interview scheduled'
      });
    }
    
    application.interview.status = status;
    application.interview.feedback = feedback;
    
    await application.save();
    
    res.json({
      success: true,
      message: 'Interview status updated',
      data: application.interview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating interview',
      error: error.message
    });
  }
};

// @desc    Withdraw application
// @route   DELETE /api/applications/:id
// @access  Private/Student
exports.withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check if student owns this application
    const student = await Student.findOne({ user: req.user.id });
    if (application.student.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }
    
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application at current stage'
      });
    }
    
    await application.deleteOne();
    
    // Update job/internship applications count
    if (application.job) {
      await Job.findByIdAndUpdate(application.job, {
        $inc: { applications: -1 }
      });
    } else if (application.internship) {
      await Internship.findByIdAndUpdate(application.internship, {
        $inc: { applications: -1 }
      });
    }
    
    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error withdrawing application',
      error: error.message
    });
  }
};

// @desc    Get application statistics
// @route   GET /api/applications/statistics
// @access  Private/Admin
exports.getApplicationStatistics = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentApplications = await Application.countDocuments({
      createdAt: { $gte: lastWeek }
    });
    
    res.json({
      success: true,
      data: {
        byStatus: stats,
        recentApplications,
        total: await Application.countDocuments()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching application statistics',
      error: error.message
    });
  }
};