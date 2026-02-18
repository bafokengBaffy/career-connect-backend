const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

// ========================
// reviews.js – generated routes
// ========================

// GET all
router.get('/', reviewsController.getAll);

// GET single by ID
router.get('/:id', reviewsController.getOne);

// POST create new
router.post('/', reviewsController.create);

// PUT update by ID
router.put('/:id', reviewsController.update);

// DELETE by ID
router.delete('/:id', reviewsController.delete);

module.exports = router;
