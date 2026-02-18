const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');

// ========================
// follows.js – generated routes
// ========================

// GET all
router.get('/', followController.getAll);

// GET single by ID
router.get('/:id', followController.getOne);

// POST create new
router.post('/', followController.create);

// PUT update by ID
router.put('/:id', followController.update);

// DELETE by ID
router.delete('/:id', followController.delete);

module.exports = router;
