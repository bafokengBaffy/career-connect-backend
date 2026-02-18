// @ts-nocheck
const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');

// ========================
// internships.js � generated routes
// ========================

// GET all
router.get('/', internshipController.getAll);

// GET single by ID
router.get('/:id', internshipController.getOne);

// POST create new
router.post('/', internshipController.create);

// PUT update by ID
router.put('/:id', internshipController.update);

// DELETE by ID
router.delete('/:id', internshipController.delete);

module.exports = router;
