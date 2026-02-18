// @ts-nocheck
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// ========================
// projects.js � generated routes
// ========================

// GET all
router.get('/', projectController.getAll);

// GET single by ID
router.get('/:id', projectController.getOne);

// POST create new
router.post('/', projectController.create);

// PUT update by ID
router.put('/:id', projectController.update);

// DELETE by ID
router.delete('/:id', projectController.delete);

module.exports = router;
