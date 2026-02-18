// @ts-nocheck
const Application = require('../models/Application');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private/Admin
exports.getApplications = async (/** @type {{ query: { status: any; job: any; internship: any; student: any; page?: 1 | undefined; limit?: 10 | undefined; }; }} */ req, /** @type {{ json: (arg0: { success: boolean; data: (import("mongoose").Document<unknown, {}, { student: import("mongoose").Types.ObjectId; positionType: "job" | "internship"; company: import("mongoose").Types.ObjectId; status: "draft" | "submitted" | "under-review" | "shortlisted" | "interview" | "technical-test" | "hr-round" | "offered" | "accepted" | "rejected" | "withdrawn" | "on-hold"; statusHistory: import("mongoose").Types.DocumentArray<{ timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }>; responses: import("mongoose").Types.DocumentArray<{ attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }, {}, {}> & { attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }>; attachments: import("mongoose").Types.DocumentArray<{ uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }>; screeningAnswers: import("mongoose").Types.DocumentArray<{ question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }, {}, {}> & { question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }>; notes: import("mongoose").Types.DocumentArray<{ isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }>; createdAt: NativeDate; flags: import("mongoose").Types.DocumentArray<{ resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }>; isBookmarked: boolean; viewedByCompany: boolean; viewedBy: import("mongoose").Types.DocumentArray<{ viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }>; updatedAt: NativeDate; viewedAt?: NativeDate | null | undefined; submittedAt?: NativeDate | null | undefined; job?: import("mongoose").Types.ObjectId | null | undefined; internship?: import("mongoose").Types.ObjectId | null | undefined; applicationData?: { willingToRelocate: boolean; portfolio?: string | null | undefined; linkedIn?: string | null | undefined; github?: string | null | undefined; website?: string | null | undefined; preferredLocation?: string | null | undefined; coverLetter?: string | null | undefined; resume?: { url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; } | null | undefined; expectedSalary?: { currency: string; amount?: number | null | undefined; period?: "hour" | "month" | "year" | null | undefined; } | null | undefined; noticePeriod?: { days?: number | null | undefined; negotiable?: boolean | null | undefined; } | null | undefined; currentEmployment?: { company?: string | null | undefined; position?: string | null | undefined; years?: number | null | undefined; } | null | undefined; workAuthorization?: { status?: string | null | undefined; country?: string | null | undefined; } | null | undefined; } | null | undefined; interviewSchedule?: { scheduled: boolean; rounds: import("mongoose").Types.DocumentArray<{ status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }, {}, {}> & { status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }>; feedback?: string | null | undefined; } | null | undefined; rating?: number | null | undefined; offer?: { documents: string[]; extendedAt?: NativeDate | null | undefined; expiresAt?: NativeDate | null | undefined; acceptedAt?: NativeDate | null | undefined; rejectedAt?: NativeDate | null | undefined; details?: { benefits: string[]; position?: string | null | undefined; location?: string | null | undefined; salary?: number | null | undefined; joiningDate?: NativeDate | null | undefined; additionalNotes?: string | null | undefined; } | null | undefined; } | null | undefined; }, { id: string; }, import("mongoose").DefaultSchemaOptions> & Omit<{ student: import("mongoose").Types.ObjectId; positionType: "job" | "internship"; company: import("mongoose").Types.ObjectId; status: "draft" | "submitted" | "under-review" | "shortlisted" | "interview" | "technical-test" | "hr-round" | "offered" | "accepted" | "rejected" | "withdrawn" | "on-hold"; statusHistory: import("mongoose").Types.DocumentArray<{ timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { timestamp: NativeDate; status?: string | null | undefined; note?: string | null | undefined; changedBy?: import("mongoose").Types.ObjectId | null | undefined; }>; responses: import("mongoose").Types.DocumentArray<{ attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }, {}, {}> & { attachments: import("mongoose").Types.DocumentArray<{ url?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { url?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { url?: string | null | undefined; filename?: string | null | undefined; }>; questionId?: string | null | undefined; question?: string | null | undefined; answer?: any; }>; attachments: import("mongoose").Types.DocumentArray<{ uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }, {}, {}> & { uploadedAt: NativeDate; type?: "portfolio" | "resume" | "cover-letter" | "certificate" | "other" | null | undefined; url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; }>; screeningAnswers: import("mongoose").Types.DocumentArray<{ question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }, {}, {}> & { question?: string | null | undefined; answer?: string | null | undefined; isCorrect?: boolean | null | undefined; }>; notes: import("mongoose").Types.DocumentArray<{ isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { isPrivate: boolean; createdAt: NativeDate; content?: string | null | undefined; author?: import("mongoose").Types.ObjectId | null | undefined; }>; createdAt: NativeDate; flags: import("mongoose").Types.DocumentArray<{ resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { resolved: boolean; type?: "duplicate" | "incomplete" | "needs-review" | "potential-fraud" | null | undefined; resolvedAt?: NativeDate | null | undefined; resolvedBy?: import("mongoose").Types.ObjectId | null | undefined; }>; isBookmarked: boolean; viewedByCompany: boolean; viewedBy: import("mongoose").Types.DocumentArray<{ viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }, {}, {}> & { viewedAt: NativeDate; user?: import("mongoose").Types.ObjectId | null | undefined; }>; updatedAt: NativeDate; viewedAt?: NativeDate | null | undefined; submittedAt?: NativeDate | null | undefined; job?: import("mongoose").Types.ObjectId | null | undefined; internship?: import("mongoose").Types.ObjectId | null | undefined; applicationData?: { willingToRelocate: boolean; portfolio?: string | null | undefined; linkedIn?: string | null | undefined; github?: string | null | undefined; website?: string | null | undefined; preferredLocation?: string | null | undefined; coverLetter?: string | null | undefined; resume?: { url?: string | null | undefined; publicId?: string | null | undefined; filename?: string | null | undefined; } | null | undefined; expectedSalary?: { currency: string; amount?: number | null | undefined; period?: "hour" | "month" | "year" | null | undefined; } | null | undefined; noticePeriod?: { days?: number | null | undefined; negotiable?: boolean | null | undefined; } | null | undefined; currentEmployment?: { company?: string | null | undefined; position?: string | null | undefined; years?: number | null | undefined; } | null | undefined; workAuthorization?: { status?: string | null | undefined; country?: string | null | undefined; } | null | undefined; } | null | undefined; interviewSchedule?: { scheduled: boolean; rounds: import("mongoose").Types.DocumentArray<{ status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, { status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }, {}, {}> & { status: "scheduled" | "completed" | "cancelled" | "rescheduled"; type?: "phone" | "video" | "in-person" | "technical" | "hr" | null | undefined; feedback?: string | null | undefined; round?: number | null | undefined; scheduledAt?: NativeDate | null | undefined; duration?: number | null | undefined; meetingLink?: string | null | undefined; location?: string | null | undefined; interviewer?: { name?: string | null | undefined; email?: string | null | undefined; userId?: import("mongoose").Types.ObjectId | null | undefined; } | null | undefined; rating?: number | null | undefined; }>; feedback?: string | null | undefined; } | null | undefined; rating?: number | null | undefined; offer?: { documents: string[]; extendedAt?: NativeDate | null | undefined; expiresAt?: NativeDate | null | undefined; acceptedAt?: NativeDate | null | undefined; rejectedAt?: NativeDate | null | undefined; details?: { benefits: string[]; position?: string | null | undefined; location?: string | null | undefined; salary?: number | null | undefined; joiningDate?: NativeDate | null | undefined; additionalNotes?: string | null | undefined; } | null | undefined; } | null | undefined; } & { _id: import("mongoose").Types.ObjectId; } & { __v: number; }, "id"> & { id: string; })[]; pagination: { page: number; limit: number; total: number; pages: number; }; }) => void; status: (arg0: number) => { (): any; new (): any; json: { (arg0: { success: boolean; message: string; error: any; }): void; new (): any; }; }; }} */ res) => {
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

// backend/controllers/applicationController.js

// Add these missing methods to your existing file:

// @desc    Get applications for a specific job
// @route   GET /api/applications/job/:jobId
// @access  Private/Company
exports.getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const applications = await Application.find({ job: jobId })
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'firstName lastName email profilePicture'
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Application.countDocuments({ job: jobId });
    
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
      message: 'Error fetching job applications',
      error: error.message
    });
  }
};

// @desc    Get applications for a specific student
// @route   GET /api/applications/student/:studentId
// @access  Private/Student
exports.getStudentApplications = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const applications = await Application.find({ student: studentId })
      .populate('job')
      .populate('internship')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Application.countDocuments({ student: studentId });
    
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
      message: 'Error fetching student applications',
      error: error.message
    });
  }
};

// @desc    Get applications for a specific company
// @route   GET /api/applications/company/:companyId
// @access  Private/Company
exports.getCompanyApplications = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Find all jobs/internships for this company
    const jobs = await Job.find({ companyId }).select('_id');
    const internships = await Internship.find({ companyId }).select('_id');
    
    const jobIds = jobs.map(j => j._id);
    const internshipIds = internships.map(i => i._id);
    
    const applications = await Application.find({
      $or: [
        { job: { $in: jobIds } },
        { internship: { $in: internshipIds } }
      ]
    })
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
    
    const total = await Application.countDocuments({
      $or: [
        { job: { $in: jobIds } },
        { internship: { $in: internshipIds } }
      ]
    });
    
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
      message: 'Error fetching company applications',
      error: error.message
    });
  }
};

// @desc    Create a new application
// @route   POST /api/applications
// @access  Private/Student
exports.createApplication = async (req, res) => {
  try {
    const { jobId, internshipId, coverLetter, resume, additionalDocs } = req.body;
    
    // Find student by user ID
    const student = await Student.findOne({ user: req.user.id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }
    
    // Check if already applied
    let existingApplication;
    if (jobId) {
      existingApplication = await Application.findOne({
        student: student._id,
        job: jobId
      });
    } else if (internshipId) {
      existingApplication = await Application.findOne({
        student: student._id,
        internship: internshipId
      });
    }
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this position'
      });
    }
    
    // Create application
    const application = await Application.create({
      student: student._id,
      job: jobId || null,
      internship: internshipId || null,
      coverLetter,
      resume: resume || student.resume,
      additionalDocs,
      status: 'pending'
    });
    
    // Update job/internship application count
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        $inc: { applicationsCount: 1 }
      });
    } else if (internshipId) {
      await Internship.findByIdAndUpdate(internshipId, {
        $inc: { applicationsCount: 1 }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating application',
      error: error.message
    });
  }
};

// @desc    Add note to application
// @route   POST /api/applications/:id/notes
// @access  Private/Company
exports.addNote = async (req, res) => {
  try {
    const { note } = req.body;
    
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            content: note,
            addedBy: req.user.id,
            addedAt: Date.now()
          }
        }
      },
      { new: true }
    );
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Note added successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding note',
      error: error.message
    });
  }
};

// @desc    Add feedback to application
// @route   POST /api/applications/:id/feedback
// @access  Private/Company
exports.addFeedback = async (req, res) => {
  try {
    const { feedback } = req.body;
    
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        feedback,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Feedback added successfully',
      data: application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding feedback',
      error: error.message
    });
  }
};

// @desc    Delete application (admin only)
// @route   DELETE /api/applications/:id
// @access  Private/Admin
exports.deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    await application.deleteOne();
    
    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting application',
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