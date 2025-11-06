const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Admin routes only
router.get('/stats', authenticate, requireAdmin, revenueController.getStats);
router.get('/daily', authenticate, requireAdmin, revenueController.getDailyRevenue);
router.get('/comparison', authenticate, requireAdmin, revenueController.getComparison);
router.get('/detailed', authenticate, requireAdmin, revenueController.getDetailed);
router.get('/settlement', authenticate, requireAdmin, revenueController.getSettlement);
router.get('/top-movies', authenticate, requireAdmin, revenueController.getTopMovies);
router.get('/by-cinema', authenticate, requireAdmin, revenueController.getRevenueByCinema);
router.get('/export', authenticate, requireAdmin, revenueController.exportReport);

module.exports = router;

