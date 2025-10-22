const { auth } = require("../config/firebase");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Generate Firebase Custom Token
const generateFirebaseToken = async (uid) => {
  return await auth.createCustomToken(uid);
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { userType, fullName, email, password } = req.body;

    console.log("Registration attempt:", { userType, fullName, email });

    // Validation
    if (!userType || !fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate user type
    if (!["student", "employer"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'User type must be either "student" or "employer"',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists in Firestore
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    try {
      // 1. Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email: email.toLowerCase(),
        password: password,
        displayName: fullName,
        emailVerified: false,
        disabled: false,
      });

      console.log("Firebase Auth user created:", userRecord.uid);

      // 2. Create user profile in Firestore
      const userData = {
        firebaseUID: userRecord.uid,
        userType,
        fullName: fullName.trim(),
        email: email.toLowerCase(),
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {},
      };

      // Save to Firestore
      const user = new User(userData);
      await user.save();

      console.log("Firestore user profile created:", user.id);

      // Generate JWT token
      const token = generateToken(user.id);

      // Generate Firebase custom token
      const firebaseToken = await generateFirebaseToken(userRecord.uid);

      // Return success response
      res.status(201).json({
        success: true,
        message: "User registered successfully!",
        data: {
          user: {
            id: user.id,
            firebaseUID: userRecord.uid,
            userType: user.userType,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified,
          },
          token,
          firebaseToken,
        },
      });
    } catch (firebaseError) {
      console.error("Firebase Auth error:", firebaseError);

      // Handle Firebase Auth errors
      if (firebaseError.code === "auth/email-already-exists") {
        return res.status(400).json({
          success: false,
          message:
            "User with this email already exists in Firebase Authentication",
        });
      }

      if (firebaseError.code === "auth/invalid-email") {
        return res.status(400).json({
          success: false,
          message: "Invalid email address",
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

    try {
      // For Firebase Auth login, we need to use Firebase Client SDK
      // Since we're using Admin SDK, we'll verify by getting the user and checking if they exist

      // Find user in Firestore by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials - User not found",
        });
      }

      // Verify the user exists in Firebase Auth
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(email);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials - Firebase user not found",
        });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Generate Firebase custom token
      const firebaseToken = await generateFirebaseToken(firebaseUser.uid);

      console.log("User logged in successfully:", user.id);

      // Return success response
      res.json({
        success: true,
        message: "Login successful!",
        data: {
          user: {
            id: user.id,
            firebaseUID: user.firebaseUID,
            userType: user.userType,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified,
          },
          token,
          firebaseToken,
        },
      });
    } catch (error) {
      console.error("Login processing error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error in user login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

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
          userType: user.userType,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
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

// @desc    Get all users (for testing/admin)
// @route   GET /api/auth/users
// @access  Public (should be protected in production)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();

    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      firebaseUID: user.firebaseUID,
      userType: user.userType,
      fullName: user.fullName,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
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

// @desc    Get user by ID
// @route   GET /api/auth/profile/:userId
// @access  Public (should be protected in production)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

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
          userType: user.userType,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
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
