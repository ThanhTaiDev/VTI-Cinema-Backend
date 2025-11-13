const dashboardService = require('../services/dashboard.service');

/**
 * Get dashboard summary
 */
exports.getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

/**
 * Get revenue chart data
 */
exports.getRevenueChart = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await dashboardService.getRevenueChart(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * Get tickets chart data
 */
exports.getTicketsChart = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await dashboardService.getTicketsChart(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * Get upcoming screenings
 */
exports.getUpcomingScreenings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const screenings = await dashboardService.getUpcomingScreenings(limit);
    res.json(screenings);
  } catch (err) {
    next(err);
  }
};

/**
 * Get promotions
 */
exports.getPromotions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const promotions = await dashboardService.getPromotions(limit);
    res.json(promotions);
  } catch (err) {
    next(err);
  }
};

/**
 * Get banners
 */
exports.getBanners = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const banners = await dashboardService.getBanners(limit);
    res.json(banners);
  } catch (err) {
    next(err);
  }
};

/**
 * Get activity feed
 */
exports.getActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await dashboardService.getActivity(limit);
    res.json(activities);
  } catch (err) {
    next(err);
  }
};

/**
 * Get system alerts
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const alerts = await dashboardService.getAlerts();
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

