const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// Public routes - no authentication required
// Order matters: more specific routes first
router.get('/', promotionController.getAll);
router.get('/id/:id', promotionController.getById); // Use /id/:id to avoid conflict with slug
router.get('/:slug', promotionController.getBySlug); // Must be last to catch slug

module.exports = router;

