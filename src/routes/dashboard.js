const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// All dashboard routes require dashboard:view permission
router.get('/summary', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getSummary);
router.get('/revenue', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getRevenueChart);
router.get('/tickets', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getTicketsChart);
router.get('/upcoming-screenings', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getUpcomingScreenings);
router.get('/promotions', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getPromotions);
router.get('/banners', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getBanners);
router.get('/activity', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getActivity);
router.get('/alerts', authenticate, authorize(PERMISSIONS.DASHBOARD_VIEW), dashboardController.getAlerts);

module.exports = router;

