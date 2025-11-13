const promotionService = require('../services/promotionService');

/**
 * Get all promotions with pagination and filters
 * GET /api/promotions?page=1&limit=12&search=...&featured=true
 */
exports.getAll = async (req, res, next) => {
  try {
    const result = await promotionService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get promotion by slug
 * GET /api/promotions/:slug
 */
exports.getBySlug = async (req, res, next) => {
  try {
    const promotion = await promotionService.getBySlug(req.params.slug);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    res.json(promotion);
  } catch (err) {
    next(err);
  }
};

/**
 * Get promotion by ID
 * GET /api/promotions/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const promotion = await promotionService.getById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    res.json(promotion);
  } catch (err) {
    next(err);
  }
};

