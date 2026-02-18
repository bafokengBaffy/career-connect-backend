// @ts-nocheck
const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');

// ========================
// education.js � generated routes
// ========================

// GET all
router.get('/', educationController.getAll);

// GET single by ID
router.get('/:id', educationController.getOne);

// POST create new
router.post('/', educationController.create);

// PUT update by ID
router.put('/:id', educationController.update);

// DELETE by ID
router.delete('/:id', educationController.delete);

module.exports = router;
