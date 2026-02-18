// @ts-nocheck
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// ========================
// news.js � generated routes
// ========================

// GET all
router.get('/', newsController.getAll);

// GET single by ID
router.get('/:id', newsController.getOne);

// POST create new
router.post('/', newsController.create);

// PUT update by ID
router.put('/:id', newsController.update);

// DELETE by ID
router.delete('/:id', newsController.delete);

module.exports = router;
