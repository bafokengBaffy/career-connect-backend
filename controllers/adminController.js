// @ts-nocheck
const Admin = require('../models/Admin');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

// @desc    Get admin profile
// @route   GET /api/admins/profile
// @access  Private/Admin
exports.getAdminProfile = async (/** @type {{ user: { id: any; }; }} */ req, /** @type {{ status: (arg0: number) => { (): any; new (): any; json: { (arg0: { success: boolean; message: string; error?: any; }): void; new (): any; }; }; json: (arg0: { success: boolean; data: any; }) => void; }} */ res) => {
  try {
    const admin = await Admin.findOne({ user: req.user.id })
      .populate('user', 'firstName lastName email profilePicture');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin profile',
      error: error.message
    });
  }
};

// @desc    Create admin
// @route   POST /api/admins
// @access  Private/SuperAdmin
exports.createAdmin = async (req, res) => {
  try {
    const { userId, role, permissions, department } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if already admin
    const existingAdmin = await Admin.findOne({ user: userId });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }
    
    // Create admin
    const admin = await Admin.create({
      user: userId,
      role,
      permissions,
      department
    });
    
    // Update user role
    user.role = 'admin';
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating admin',
      error: error.message
    });
  }
};

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private/SuperAdmin
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .populate('user', 'firstName lastName email profilePicture isActive')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message
    });
  }
};

// @desc    Get admin by ID
// @route   GET /api/admins/:id
// @access  Private/SuperAdmin
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id)
      .populate('user', 'firstName lastName email profilePicture isActive');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin',
      error: error.message
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admins/:id
// @access  Private/SuperAdmin
exports.updateAdmin = async (req, res) => {
  try {
    const { role, permissions, department, isActive } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      {
        role,
        permissions,
        department,
        isActive,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating admin',
      error: error.message
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
// @access  Private/SuperAdmin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Update user role back to user
    await User.findByIdAndUpdate(admin.user, { role: 'user' });
    
    await admin.deleteOne();
    
    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting admin',
      error: error.message
    });
  }
};

// @desc    Log admin activity
// @route   POST /api/admins/activity
// @access  Private/Admin
exports.logActivity = async (req, res) => {
  try {
    const { action, targetType, targetId, details } = req.body;
    
    const admin = await Admin.findOne({ user: req.user.id });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    await admin.logActivity(
      action,
      targetType,
      targetId,
      details,
      req.ip
    );
    
    res.json({
      success: true,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging activity',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admins/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await Admin.getDashboardStats();
    
    // Get recent activities
    const recentActivities = await Admin.findOne({ user: req.user.id })
      .select('activityLog')
      .then(admin => admin?.activityLog.slice(-10) || []);
    
    res.json({
      success: true,
      data: {
        ...stats,
        recentActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/admins/notifications/preferences
// @access  Private/Admin
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, system } = req.body;
    
    const admin = await Admin.findOneAndUpdate(
      { user: req.user.id },
      {
        notificationPreferences: {
          email,
          system
        },
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: admin.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message
    });
  }
};

// @desc    Check permission
// @route   GET /api/admins/check-permission/:permission
// @access  Private/Admin
exports.checkPermission = async (req, res) => {
  try {
    const admin = await Admin.findOne({ user: req.user.id });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const hasPermission = admin.hasPermission(req.params.permission);
    
    res.json({
      success: true,
      data: {
        hasPermission
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking permission',
      error: error.message
    });
  }
};