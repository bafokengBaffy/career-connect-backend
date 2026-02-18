// @ts-nocheck
const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');

// ========================
// skills.js � generated routes
// ========================

// GET all
router.get('/', skillController.getAll);

// GET single by ID
router.get('/:id', skillController.getOne);

// POST create new
router.post('/', skillController.create);

// PUT update by ID
router.put('/:id', skillController.update);

// DELETE by ID
router.delete('/:id', skillController.delete);

module.exports = router;
