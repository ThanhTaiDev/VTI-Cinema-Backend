const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const { authenticate } = require('../middlewares/auth');

// Authenticated routes
router.post('/screenings/:id/hold-seats', authenticate, seatController.holdSeats);
router.get('/screenings/:id/seat-statuses', authenticate, seatController.getSeatStatuses);

module.exports = router;

