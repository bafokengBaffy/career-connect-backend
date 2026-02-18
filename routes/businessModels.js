const express = require('express');
const router = express.Router();
const businessModelController = require('../controllers/businessModelController');

// ========================
// businessModels.js – generated routes
// ========================

// GET all
router.get('/', businessModelController.getAll);

// GET single by ID
router.get('/:id', businessModelController.getOne);

// POST create new
router.post('/', businessModelController.create);

// PUT update by ID
router.put('/:id', businessModelController.update);

// DELETE by ID
router.delete('/:id', businessModelController.delete);

module.exports = router;
