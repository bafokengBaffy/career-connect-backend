// @ts-nocheck
const express = require("express");
const { db, isFirebaseInitialized } = require("../config/firebase");
const router = express.Router();

// Get all courses
router.get("/", async (req, res) => {
  try {
    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const coursesSnapshot = await db.collection("courses").get();
    const courses = [];

    coursesSnapshot.forEach((doc) => {
      courses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      count: courses.length,
      courses: courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get course by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const courseDoc = await db.collection("courses").doc(id).get();

    if (!courseDoc.exists) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({
      success: true,
      course: {
        id: courseDoc.id,
        ...courseDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
