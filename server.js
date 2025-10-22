const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import Firebase configuration (this will initialize Firebase)
const { isFirebaseInitialized } = require("./config/firebase");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Check Firebase initialization
app.use((req, res, next) => {
  if (!isFirebaseInitialized()) {
    return res.status(500).json({
      success: false,
      message: "Firebase not initialized. Check server configuration.",
    });
  }
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/institutions", require("./routes/institutions"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/companies", require("./routes/companies"));

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Career Connect Lesotho API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV || "development",
    database: "Firebase Firestore",
    project: process.env.FIREBASE_PROJECT_ID,
    firebase: isFirebaseInitialized() ? "✅ Initialized" : "❌ Not Initialized",
    endpoints: [
      "POST /api/auth/register - User registration",
      "POST /api/auth/login - User login",
      "GET /api/auth/users - Get all users",
      "GET /api/auth/profile - Get user profile (protected)",
      "GET /api/institutions - Get institutions",
      "GET /api/courses - Get courses",
      "GET /api/companies - Get companies",
    ],
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Career Connect Lesotho API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    firebase: isFirebaseInitialized() ? "Connected" : "Disconnected",
    database: "Firebase Firestore",
  });
});

// Development info route
app.get("/api/dev/info", (req, res) => {
  res.json({
    mode: process.env.NODE_ENV || "development",
    firebase: {
      initialized: isFirebaseInitialized(),
      projectId: process.env.FIREBASE_PROJECT_ID,
      serviceAccount: process.env.FIREBASE_CLIENT_EMAIL
        ? "Configured"
        : "Not configured",
    },
    features: {
      authentication: "JWT + Firebase Firestore",
      database: "Firebase Firestore",
      storage: "Firebase Storage",
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /health",
      "GET /api/dev/info",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/users",
      "GET /api/auth/profile",
      "GET /api/auth/profile/:userId",
      "GET /api/institutions",
      "GET /api/courses",
      "GET /api/companies",
    ],
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});
