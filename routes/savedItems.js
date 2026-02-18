// @ts-nocheck
const express = require('express');
const router = express.Router();
const savedItemController = require('../controllers/savedItemController');

// ========================
// savedItems.js � generated routes
// ========================

// GET all
router.get('/', savedItemController.getAll);

// GET single by ID
router.get('/:id', savedItemController.getOne);

// POST create new
router.post('/', savedItemController.create);

// PUT update by ID
router.put('/:id', savedItemController.update);

// DELETE by ID
router.delete('/:id', savedItemController.delete);

module.exports = router;
