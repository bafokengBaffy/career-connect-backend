// @ts-nocheck
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_companies',
      'manage_jobs',
      'manage_internships',
      'manage_applications',
      'view_analytics',
      'manage_system',
      'manage_reviews',
      'send_notifications',
      'manage_admins'
    ]
  }],
  department: {
    type: String,
    default: 'Administration'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  activityLog: [{
    action: String,
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    system: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Log activity
adminSchema.methods.logActivity = function(action, targetType, targetId, details = {}, ipAddress = null) {
  this.activityLog.push({
    action,
    targetType,
    targetId,
    details,
    ipAddress,
    timestamp: new Date()
  });
  
  // Keep only last 1000 activities
  if (this.activityLog.length > 1000) {
    this.activityLog = this.activityLog.slice(-1000);
  }
  
  return this.save();
};

// Check permission
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Get dashboard statistics
adminSchema.statics.getDashboardStats = async function() {
  const User = mongoose.model('User');
  const Company = mongoose.model('Company');
  const Job = mongoose.model('Job');
  const Internship = mongoose.model('Internship');
  const Application = mongoose.model('Application');
  
  const [
    totalUsers,
    totalCompanies,
    totalJobs,
    totalInternships,
    totalApplications,
    pendingCompanies
  ] = await Promise.all([
    User.countDocuments(),
    Company.countDocuments(),
    Job.countDocuments(),
    Internship.countDocuments(),
    Application.countDocuments(),
    Company.countDocuments({ status: 'pending' })
  ]);
  
  return {
    users: totalUsers,
    companies: totalCompanies,
    jobs: totalJobs,
    internships: totalInternships,
    applications: totalApplications,
    pendingCompanies
  };
};

module.exports = mongoose.model('Admin', adminSchema);