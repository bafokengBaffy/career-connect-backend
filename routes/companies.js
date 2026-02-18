// @ts-nocheck
const express = require("express");
const { db, isFirebaseInitialized } = require("../config/firebase");
const router = express.Router();

// Get all companies
router.get("/", async (req, res) => {
  try {
    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const companiesSnapshot = await db.collection("companies").get();
    const companies = [];

    companiesSnapshot.forEach((doc) => {
      companies.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      count: companies.length,
      companies: companies,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get company by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isFirebaseInitialized()) {
      return res.status(503).json({ error: "Firebase not configured" });
    }

    const companyDoc = await db.collection("companies").doc(id).get();

    if (!companyDoc.exists) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      success: true,
      company: {
        id: companyDoc.id,
        ...companyDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
