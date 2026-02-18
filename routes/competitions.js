// @ts-nocheck
const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');

// ========================
// competitions.js � generated routes
// ========================

// GET all
router.get('/', competitionController.getAll);

// GET single by ID
router.get('/:id', competitionController.getOne);

// POST create new
router.post('/', competitionController.create);

// PUT update by ID
router.put('/:id', competitionController.update);

// DELETE by ID
router.delete('/:id', competitionController.delete);

module.exports = router;
