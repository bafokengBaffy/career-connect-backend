const express = require("express");
const { db, isFirebaseInitialized } = require("../config/firebase");
const router = express.Router();

// Get all institutions
router.get("/", async (req, res) => {
  try {
    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const institutionsSnapshot = await db.collection("institutions").get();
    const institutions = [];

    institutionsSnapshot.forEach((doc) => {
      institutions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      count: institutions.length,
      institutions: institutions,
    });
  } catch (error) {
    console.error("Error fetching institutions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get institution by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const institutionDoc = await db.collection("institutions").doc(id).get();

    if (!institutionDoc.exists) {
      return res.status(404).json({ error: "Institution not found" });
    }

    res.json({
      success: true,
      institution: {
        id: institutionDoc.id,
        ...institutionDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error fetching institution:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get courses for an institution
router.get("/:id/courses", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const coursesSnapshot = await db
      .collection("courses")
      .where("institutionId", "==", id)
      .get();

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

module.exports = router;
