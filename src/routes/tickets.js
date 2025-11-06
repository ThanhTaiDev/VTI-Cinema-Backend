const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// User routes - Deprecated: Use Orders + Payments flow instead
router.post('/', (req, res) => {
  res.status(410).json({ 
    error: 'Deprecated. Use Orders + Payments flow instead.',
    message: 'Tickets are now created automatically after payment. Please use: hold seats → create order → init payment'
  });
});

// Admin routes
router.get('/', authenticate, requireAdmin, ticketController.getAll);
router.get('/:id', authenticate, ticketController.getById);
router.post('/:id/cancel', authenticate, requireAdmin, ticketController.cancel);
router.post('/:id/lock', authenticate, requireAdmin, ticketController.lock);

module.exports = router;

