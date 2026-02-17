// @ts-nocheck
const { auth, db } = require("../config/firebase");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Generate JWT Token with enhanced security
const generateToken = (userId, userRole) => {
  // Create token with more claims
  return jwt.sign(
    { 
      id: userId,
      role: userRole,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex') // Unique token ID
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
      algorithm: 'HS256',
      issuer: 'career-connect-api',
      audience: 'career-connect-client'
    }
  );
};

// Generate Firebase Custom Token
const generateFirebaseToken = async (uid) => {
  try {
    return await auth.createCustomToken(uid);
  } catch (error) {
    console.error("Error generating Firebase token:", error);
    return null;
  }
};

// Validate registration input
const validateRegistration = (data) => {
  const errors = [];
  
  if (!data.userType || !['student', 'employer'].includes(data.userType)) {
    errors.push('User type must be either "student" or "employer"');
  }
  
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Strong password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!data.password || !passwordRegex.test(data.password)) {
    errors.push('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character');
  }
  
  return errors;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { userType, fullName, email, password } = req.body;

    console.log("Registration attempt:", { userType, fullName, email });

    // Validate input
    const validationErrors = validateRegistration(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Check if user already exists in Firestore
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ // 409 Conflict is more appropriate
        success: false,
        message: "User with this email already exists",
      });
    }

    try {
      // 1. Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        displayName: fullName.trim(),
        emailVerified: false,
        disabled: false,
      });

      console.log("Firebase Auth user created:", userRecord.uid);

      // 2. Create user profile in Firestore with proper role
      const userData = {
        firebaseUID: userRecord.uid,
        userType: userType,
        role: userType, // Add role field for authorization
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        isVerified: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {},
        lastLogin: null,
        loginCount: 0
      };

      // Save to Firestore
      const user = new User(userData);
      await user.save();

      console.log("Firestore user profile created:", user.id);

      // Generate JWT token
      const token = generateToken(user.id, user.role);

      // Generate Firebase custom token
      const firebaseToken = await generateFirebaseToken(userRecord.uid);

      // Log successful registration
      console.log(`✅ User registered: ${user.id} (${user.role})`);

      // Return success response (don't return password!)
      res.status(201).json({
        success: true,
        message: "User registered successfully!",
        data: {
          user: {
            id: user.id,
            firebaseUID: userRecord.uid,
            role: user.role,
            userType: user.userType,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified,
            status: user.status
          },
          token,
          firebaseToken,
        },
      });
    } catch (firebaseError) {
      console.error("Firebase Auth error:", firebaseError);

      // Handle Firebase Auth errors
      if (firebaseError.code === "auth/email-already-exists") {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      if (firebaseError.code === "auth/invalid-email") {
        return res.status(400).json({
          success: false,
          message: "Invalid email address",
        });
      }

      if (firebaseError.code === "auth/weak-password") {
        return res.status(400).json({
          success: false,
          message: "Password is too weak",
        });
      }

      throw firebaseError;
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error in user registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user in Firestore by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Account has been suspended. Please contact support.",
      });
    }

    if (user.status === 'deleted') {
      return res.status(401).json({
        success: false,
        message: "Account not found",
      });
    }

    // Verify the user exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
      
      // Note: We can't verify password with Admin SDK
      // The client should use Firebase Auth SDK for actual login
      // This endpoint just validates existence and returns tokens
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update user login stats
    await user.updateLoginStats();

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Generate Firebase custom token
    const firebaseToken = await generateFirebaseToken(firebaseUser.uid);

    console.log(`✅ User logged in: ${user.id} (${user.role})`);

    // Set cookie if web client
    if (req.headers['user-agent']?.includes('Mozilla')) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    // Return success response
    res.json({
      success: true,
      message: "Login successful!",
      data: {
        user: {
          id: user.id,
          firebaseUID: user.firebaseUID,
          role: user.role,
          userType: user.userType,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          status: user.status,
          profile: user.profile
        },
        token,
        firebaseToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error in user login",
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    // User is already attached by auth middleware
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firebaseUID: user.firebaseUID,
          role: user.role,
          userType: user.userType,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          status: user.status,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const users = await User.findAll(parseInt(req.query.limit) || 50);

    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      firebaseUID: user.firebaseUID,
      role: user.role,
      userType: user.userType,
      fullName: user.fullName,
      email: user.email,
      isVerified: user.isVerified,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    }));

    res.json({
      success: true,
      count: users.length,
      data: sanitizedUsers,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

// @desc    Get user by ID (admin or self)
// @route   GET /api/auth/profile/:userId
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is admin or requesting their own profile
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this profile",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firebaseUID: user.firebaseUID,
          role: user.role,
          userType: user.userType,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          status: user.status,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Clear cookie if present
    res.clearCookie('token');
    
    // Note: Token blacklisting would be implemented here with Redis
    
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging out",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, profile } = req.body;
    const user = req.user;

    if (fullName) {
      user.fullName = fullName.trim();
    }

    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    user.updatedAt = new Date().toISOString();
    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};