const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", authController.login);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, authController.getProfile);

// @route   GET /api/auth/users
// @desc    Get all users (for testing/admin)
// @access  Public (should be protected in production)
router.get("/users", authController.getUsers);

// @route   GET /api/auth/profile/:userId
// @desc    Get user by ID
// @access  Public (should be protected in production)
router.get("/profile/:userId", authController.getUserById);

module.exports = router;
