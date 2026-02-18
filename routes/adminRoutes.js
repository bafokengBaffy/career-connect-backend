// @ts-nocheck
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// ========================
// adminRoutes.js � generated routes
// ========================

// GET all
router.get('/', adminController.getAll);

// GET single by ID
router.get('/:id', adminController.getOne);

// POST create new
router.post('/', adminController.create);

// PUT update by ID
router.put('/:id', adminController.update);

// DELETE by ID
router.delete('/:id', adminController.delete);

module.exports = router;
