const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Admin routes only
router.get('/stats', authenticate, requireAdmin, revenueController.getStats);
router.get('/daily', authenticate, requireAdmin, revenueController.getDailyRevenue);

module.exports = router;

