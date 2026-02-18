// @ts-nocheck
const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experienceController');

// ========================
// experiences.js � generated routes
// ========================

// GET all
router.get('/', experienceController.getAll);

// GET single by ID
router.get('/:id', experienceController.getOne);

// POST create new
router.post('/', experienceController.create);

// PUT update by ID
router.put('/:id', experienceController.update);

// DELETE by ID
router.delete('/:id', experienceController.delete);

module.exports = router;
