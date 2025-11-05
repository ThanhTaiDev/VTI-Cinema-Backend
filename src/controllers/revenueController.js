const revenueService = require('../services/revenueService');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await revenueService.getStats(req.query);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

exports.getDailyRevenue = async (req, res, next) => {
  try {
    const revenue = await revenueService.getDailyRevenue(req.query);
    res.json(revenue);
  } catch (err) {
    next(err);
  }
};

