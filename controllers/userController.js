// @ts-nocheck
/**
 * User Controller
 * Handles all user-related operations with enterprise security
 * OWASP compliant, input validation, and error handling
 */

const User = require('../models/User');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Institution = require('../models/Institution');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// ======================
// USER MANAGEMENT
// ======================

/**
 * Get all users (Admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
exports.getUsers = async (req, res) => {
  try {
    const { 
      role, 
      isVerified, 
      isActive, 
      page = 1, 
      limit = 10, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    let query = {};
    
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        ...(mongoose.Types.ObjectId.isValid(search) ? [{ _id: search }] : [])
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const users = await User.find(query)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .limit(limitNum)
      .skip(skip)
      .sort(sort)
      .lean();
    
    // Get total count
    const total = await User.countDocuments(query);
    
    // Get role-specific details for each user
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      let roleDetails = null;
      
      if (user.role === 'student') {
        const student = await Student.findOne({ userId: user._id })
          .select('profile education skills workExperience documents')
          .lean();
        roleDetails = student;
      } else if (user.role === 'admin') {
        const admin = await Admin.findOne({ userId: user._id })
          .select('permissions department position')
          .lean();
        roleDetails = admin;
      } else if (user.role === 'company') {
        const company = await Company.findOne({ userId: user._id })
          .select('name logo industry size website')
          .lean();
        roleDetails = company;
      } else if (user.role === 'institution') {
        const institution = await Institution.findOne({ userId: user._id })
          .select('name type accreditation location')
          .lean();
        roleDetails = institution;
      }
      
      return {
        ...user,
        roleDetails
      };
    }));
    
    logger.info(`Users retrieved by admin: ${req.userId}`, { count: users.length });
    
    res.json({
      success: true,
      data: usersWithDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // Get user with all relevant data
    const user = await User.findById(req.userId)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .lean();
    
    if (!user) {
      logger.warn(`Current user not found: ${req.userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get role-specific details
    let roleDetails = null;
    let additionalData = {};
    
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id })
        .populate({
          path: 'applications.jobId',
          select: 'title company position status'
        })
        .populate('courses.courseId', 'title code status')
        .lean();
      
      roleDetails = student;
      
      // Add student-specific statistics
      additionalData = {
        applicationCount: student?.applications?.length || 0,
        courseCount: student?.courses?.length || 0,
        documentCount: student?.documents?.length || 0,
        profileCompletion: calculateProfileCompletion(student)
      };
    } else if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId: user._id }).lean();
      roleDetails = admin;
    } else if (user.role === 'company') {
      const company = await Company.findOne({ userId: user._id }).lean();
      roleDetails = company;
      
      additionalData = {
        jobPostings: company?.jobs?.length || 0,
        totalApplications: company?.totalApplications || 0
      };
    } else if (user.role === 'institution') {
      const institution = await Institution.findOne({ userId: user._id }).lean();
      roleDetails = institution;
      
      additionalData = {
        studentCount: institution?.students?.length || 0,
        courseCount: institution?.courses?.length || 0
      };
    }
    
    logger.info(`Current user profile retrieved: ${req.userId}`);
    
    res.json({
      success: true,
      data: {
        ...user,
        roleDetails,
        ...additionalData,
        lastLogin: req.session?.lastLogin || user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Error fetching current user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single user by ID
 * @route GET /api/users/:id
 * @access Private
 */
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const user = await User.findById(id)
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check authorization - users can view their own profile, admins can view any
    if (req.userId !== id && req.userRole !== 'admin') {
      logger.warn(`Unauthorized access attempt to user ${id} by ${req.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }
    
    // Get role-specific details
    let roleDetails = null;
    
    if (user.role === 'student') {
      roleDetails = await Student.findOne({ userId: user._id })
        .select('-applications -courses -documents') // Exclude sensitive/large arrays
        .lean();
    } else if (user.role === 'admin') {
      roleDetails = await Admin.findOne({ userId: user._id }).lean();
    } else if (user.role === 'company') {
      roleDetails = await Company.findOne({ userId: user._id })
        .select('name logo industry size website description location')
        .lean();
    } else if (user.role === 'institution') {
      roleDetails = await Institution.findOne({ userId: user._id })
        .select('name type accreditation location website')
        .lean();
    }
    
    logger.info(`User profile retrieved: ${id} by ${req.userId}`);
    
    res.json({
      success: true,
      data: {
        ...user,
        roleDetails
      }
    });
  } catch (error) {
    logger.error('Error fetching user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateCurrentUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { 
      firstName, 
      lastName, 
      phone, 
      location, 
      profilePicture, 
      bio,
      dateOfBirth,
      gender,
      nationality,
      preferences
    } = req.body;
    
    // Build update object (only allow specific fields)
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (location) updateData.location = location;
    if (profilePicture) updateData.profilePicture = profilePicture;
    if (bio) updateData.bio = bio.trim();
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender) updateData.gender = gender;
    if (nationality) updateData.nationality = nationality;
    if (preferences) updateData.preferences = preferences;
    
    updateData.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update role-specific profile if needed
    if (user.role === 'student') {
      await Student.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            'profile.firstName': firstName || user.firstName,
            'profile.lastName': lastName || user.lastName,
            'profile.phone': phone || user.phone,
            'profile.location': location || user.location,
            'profile.bio': bio || user.bio
          }
        }
      );
    }
    
    logger.info(`Current user profile updated: ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error updating current user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      body: req.body
    });
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user (Admin only or self)
 * @route PUT /api/users/:id
 * @access Private
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Check authorization
    if (req.userId !== id && req.userRole !== 'admin') {
      logger.warn(`Unauthorized update attempt on user ${id} by ${req.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }
    
    const { 
      firstName, 
      lastName, 
      phone, 
      location, 
      profilePicture, 
      bio,
      role,
      isVerified,
      isActive,
      email,
      preferences
    } = req.body;
    
    // Build update object
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (location) updateData.location = location;
    if (profilePicture) updateData.profilePicture = profilePicture;
    if (bio) updateData.bio = bio.trim();
    if (preferences) updateData.preferences = preferences;
    
    // Only admin can update these fields
    if (req.userRole === 'admin') {
      if (role) updateData.role = role;
      if (isVerified !== undefined) updateData.isVerified = isVerified;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ email, _id: { $ne: id } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
        updateData.email = email;
      }
    }
    
    updateData.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info(`User updated: ${id} by ${req.userId}`);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error updating user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id,
      body: req.body
    });
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Prevent admin from deleting themselves
    if (id === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Soft delete or hard delete based on configuration
    if (process.env.SOFT_DELETE === 'true') {
      // Soft delete - just mark as inactive
      user.isActive = false;
      user.deletedAt = new Date();
      await user.save();
      
      logger.info(`User soft deleted: ${id} by ${req.userId}`);
      
      return res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } else {
      // Hard delete - remove all associated data
      
      // Delete related data based on role
      if (user.role === 'student') {
        await Student.findOneAndDelete({ userId: user._id });
      } else if (user.role === 'admin') {
        await Admin.findOneAndDelete({ userId: user._id });
      } else if (user.role === 'company') {
        await Company.findOneAndDelete({ userId: user._id });
      } else if (user.role === 'institution') {
        await Institution.findOneAndDelete({ userId: user._id });
      }
      
      // Delete the user
      await User.findByIdAndDelete(id);
      
      logger.info(`User hard deleted: ${id} by ${req.userId}`);
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    }
  } catch (error) {
    logger.error('Error deleting user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password
 * @route PUT /api/users/change-password
 * @access Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn(`Failed password change attempt for user: ${req.userId}`);
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    // Invalidate all other sessions (optional)
    if (req.session) {
      req.session.destroy();
    }
    
    logger.info(`Password changed for user: ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId
    });
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change password for specific user (Admin only or self)
 * @route PUT /api/users/:id/change-password
 * @access Private
 */
exports.changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Check authorization
    if (req.userId !== id && req.userRole !== 'admin') {
      logger.warn(`Unauthorized password change attempt on user ${id} by ${req.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change this user\'s password'
      });
    }
    
    // Validate input
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    logger.info(`Password changed for user ${id} by ${req.userId}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing user password:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle user status (Admin only)
 * @route PUT /api/users/:id/toggle-status
 * @access Private/Admin
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Prevent admin from toggling their own status
    if (id === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot toggle your own status'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();
    
    logger.info(`User status toggled: ${id} by ${req.userId}`, {
      newStatus: user.isActive
    });
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { 
        isActive: user.isActive,
        userId: user._id
      }
    });
  } catch (error) {
    logger.error('Error toggling user status:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error toggling user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user (Admin only)
 * @route PUT /api/users/:id/verify
 * @access Private/Admin
 */
exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          isVerified: true,
          verifiedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info(`User verified: ${id} by ${req.userId}`);
    
    res.json({
      success: true,
      message: 'User verified successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error verifying user:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error verifying user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user statistics (Admin only)
 * @route GET /api/users/statistics
 * @access Private/Admin
 */
exports.getUserStatistics = async (req, res) => {
  try {
    // Get statistics by role
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          },
          unverified: {
            $sum: { $cond: ['$isVerified', 0, 1] }
          },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactive: {
            $sum: { $cond: ['$isActive', 0, 1] }
          }
        }
      }
    ]);
    
    // Get registration trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    // Get total counts
    const total = await User.countDocuments();
    const verifiedTotal = await User.countDocuments({ isVerified: true });
    const activeTotal = await User.countDocuments({ isActive: true });
    
    // Get recent users
    const recentUsers = await User.find()
      .select('firstName lastName email role isVerified isActive createdAt')
      .sort('-createdAt')
      .limit(10)
      .lean();
    
    logger.info(`User statistics retrieved by admin: ${req.userId}`);
    
    res.json({
      success: true,
      data: {
        overview: {
          total,
          verified: verifiedTotal,
          unverified: total - verifiedTotal,
          active: activeTotal,
          inactive: total - activeTotal,
          verificationRate: total ? Math.round((verifiedTotal / total) * 100) : 0,
          activeRate: total ? Math.round((activeTotal / total) * 100) : 0
        },
        byRole: roleStats,
        trends: registrationTrends,
        recent: recentUsers,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching user statistics:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user activity log (Admin only)
 * @route GET /api/users/:id/activity
 * @access Private/Admin
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // This would typically come from an ActivityLog model
    // For now, return basic user info
    const user = await User.findById(id)
      .select('firstName lastName email lastLogin loginCount createdAt updatedAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info(`User activity retrieved: ${id} by ${req.userId}`);
    
    res.json({
      success: true,
      data: {
        user,
        activity: [] // Placeholder for actual activity log
      }
    });
  } catch (error) {
    logger.error('Error fetching user activity:', {
      error: error.message,
      stack: error.stack,
      userId: req.userId,
      targetUserId: req.params.id
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================
// HELPER FUNCTIONS
// ======================

/**
 * Calculate profile completion percentage for student
 */
function calculateProfileCompletion(student) {
  if (!student) return 0;
  
  const sections = [
    { name: 'personalInfo', weight: 20, check: (s) => s.personalInfo && Object.keys(s.personalInfo).length > 0 },
    { name: 'contactInfo', weight: 10, check: (s) => s.contactInfo && Object.keys(s.contactInfo).length > 0 },
    { name: 'bio', weight: 10, check: (s) => s.bio && s.bio.length > 0 },
    { name: 'skills', weight: 15, check: (s) => s.skills && s.skills.length >= 3 },
    { name: 'education', weight: 15, check: (s) => s.education && s.education.length > 0 },
    { name: 'experience', weight: 15, check: (s) => s.workExperience && s.workExperience.length > 0 },
    { name: 'documents', weight: 10, check: (s) => s.documents && s.documents.length > 0 },
    { name: 'preferences', weight: 5, check: (s) => s.preferences && Object.keys(s.preferences).length > 0 }
  ];

  let completion = 0;
  sections.forEach(section => {
    if (section.check(student)) {
      completion += section.weight;
    }
  });

  return Math.min(completion, 100);
}

// Export all methods
module.exports = exports;