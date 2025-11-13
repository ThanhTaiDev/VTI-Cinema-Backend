const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Admin routes only
router.get('/stats', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getStats);
router.get('/daily', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getDailyRevenue);
router.get('/comparison', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getComparison);
router.get('/detailed', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getDetailed);
router.get('/settlement', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getSettlement);
router.get('/top-movies', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getTopMovies);
router.get('/by-cinema', authenticate, authorize(PERMISSIONS.REVENUE_VIEW), revenueController.getRevenueByCinema);
router.get('/export', authenticate, authorize(PERMISSIONS.REVENUE_EXPORT), revenueController.exportReport);

module.exports = router;

