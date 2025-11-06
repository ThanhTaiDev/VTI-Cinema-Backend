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
// IMPORTANT: Bulk routes must be defined BEFORE /:id routes to avoid route conflicts
router.get('/', authenticate, requireAdmin, ticketController.getAll);
router.get('/export', authenticate, requireAdmin, ticketController.exportToCSV);
router.post('/bulk/lock', authenticate, requireAdmin, ticketController.bulkLock);
router.post('/bulk/unlock', authenticate, requireAdmin, ticketController.bulkUnlock);
router.post('/bulk/cancel', authenticate, requireAdmin, ticketController.bulkCancel);
router.post('/bulk/refund', authenticate, requireAdmin, ticketController.bulkRefund);
router.get('/:id', authenticate, requireAdmin, ticketController.getById);
router.post('/:id/cancel', authenticate, requireAdmin, ticketController.cancel);
router.post('/:id/lock', authenticate, requireAdmin, ticketController.lock);
router.post('/:id/unlock', authenticate, requireAdmin, ticketController.unlock);
router.post('/:id/refund', authenticate, requireAdmin, ticketController.refund);

module.exports = router;

