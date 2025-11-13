const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// User routes - Deprecated: Use Orders + Payments flow instead
router.post('/', (req, res) => {
  res.status(410).json({ 
    error: 'Deprecated. Use Orders + Payments flow instead.',
    message: 'Tickets are now created automatically after payment. Please use: hold seats → create order → init payment'
  });
});

// User routes - Get user's own tickets
router.get('/my-tickets', authenticate, ticketController.getMyTickets);

// Public route for check-in (used by staff at cinema entrance)
router.post('/:id/check-in', ticketController.checkIn);

// Admin routes
// IMPORTANT: Bulk routes must be defined BEFORE /:id routes to avoid route conflicts
router.get('/', authenticate, authorize(PERMISSIONS.TICKETS_VIEW), ticketController.getAll);
router.get('/export', authenticate, authorize(PERMISSIONS.TICKETS_EXPORT), ticketController.exportToCSV);
router.post('/bulk/lock', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.bulkLock);
router.post('/bulk/unlock', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.bulkUnlock);
router.post('/bulk/cancel', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.bulkCancel);
router.post('/bulk/refund', authenticate, authorize(PERMISSIONS.TICKETS_REFUND), ticketController.bulkRefund);
router.get('/:id', authenticate, authorize(PERMISSIONS.TICKETS_VIEW), ticketController.getById);
router.post('/:id/cancel', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.cancel);
router.post('/:id/lock', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.lock);
router.post('/:id/unlock', authenticate, authorize(PERMISSIONS.TICKETS_MANAGE), ticketController.unlock);
router.post('/:id/refund', authenticate, authorize(PERMISSIONS.TICKETS_REFUND), ticketController.refund);

module.exports = router;

