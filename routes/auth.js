// @ts-nocheck
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { validateRequest, authValidations } = require("../security/validator");

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  validateRequest(authValidations.register),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  "/login",
  validateRequest(authValidations.login),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post("/logout", authController.logout);

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", protect, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  protect,
  validateRequest(authValidations.updateProfile),
  authController.updateProfile
);

/**
 * @route   GET /api/auth/profile/:userId
 * @desc    Get user by ID (self or admin)
 * @access  Private
 */
router.get("/profile/:userId", protect, authController.getUserById);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

/**
 * @route   GET /api/auth/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get("/users", protect, isAdmin, authController.getUsers);

/**
 * @route   GET /api/auth/users/role/:role
 * @desc    Get users by role
 * @access  Private/Admin
 */
router.get("/users/role/:role", protect, isAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const users = await User.findByRole(req.params.role);
    res.json({
      success: true,
      count: users.length,
      data: users.map((/** @type {{ id: any; email: any; fullName: any; role: any; status: any; }} */ u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/auth/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Private/Admin
 */
router.delete("/users/:userId", protect, isAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    await user.softDelete();
    
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/auth/users/:userId/suspend
 * @desc    Suspend user
 * @access  Private/Admin
 */
router.put("/users/:userId/suspend", protect, isAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    await user.suspend();
    
    res.json({ success: true, message: "User suspended successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/auth/users/:userId/reactivate
 * @desc    Reactivate user
 * @access  Private/Admin
 */
router.put("/users/:userId/reactivate", protect, isAdmin, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    await user.reactivate();
    
    res.json({ success: true, message: "User reactivated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;