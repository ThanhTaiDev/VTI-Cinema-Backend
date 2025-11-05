const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// User routes
router.post('/', authenticate, ticketController.create);

// Admin routes
router.get('/', authenticate, requireAdmin, ticketController.getAll);
router.get('/:id', authenticate, ticketController.getById);
router.post('/:id/cancel', authenticate, requireAdmin, ticketController.cancel);
router.post('/:id/lock', authenticate, requireAdmin, ticketController.lock);

module.exports = router;

