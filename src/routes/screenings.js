const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const seatController = require('../controllers/seatController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Public routes
router.get('/', screeningController.getAll);
router.get('/:id', screeningController.getById);
router.get('/:id/seats', seatController.getSeatMap);

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.SCREENINGS_CREATE), screeningController.create);
router.put('/:id', authenticate, authorize(PERMISSIONS.SCREENINGS_UPDATE), screeningController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.SCREENINGS_DELETE), screeningController.delete);

module.exports = router;

