const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const seatController = require('../controllers/seatController');
const seatService = require('../services/seatService');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Public routes
router.get('/', screeningController.getAll);
router.get('/:id', screeningController.getById);
router.get('/:id/seats', seatController.getSeatMap); // Legacy route - keep for backward compatibility

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.SCREENINGS_CREATE), screeningController.create);
router.put('/:id', authenticate, authorize(PERMISSIONS.SCREENINGS_UPDATE), screeningController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.SCREENINGS_DELETE), screeningController.delete);

// NEW: Get seats for screening (with pricing) - Public route for booking
router.get(
  '/:screeningId/seats-with-pricing',
  async (req, res, next) => {
    try {
      const seats = await seatService.getSeatsByScreening(req.params.screeningId);
      res.json(seats);
    } catch (err) {
      next(err);
    }
  }
);

// NEW: Create holds for seats - Protected route for booking
router.post(
  '/:screeningId/holds',
  authenticate,
  async (req, res, next) => {
    try {
      const seatHoldService = require('../services/seatHoldService');
      const { seatIds } = req.body;
      const userId = req.user.id;

      if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
        return res.status(400).json({ message: 'seatIds is required and must be an array' });
      }

      const result = await seatHoldService.createHolds(req.params.screeningId, seatIds, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

