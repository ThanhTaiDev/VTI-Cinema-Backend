const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const refundController = require('../controllers/refundController');

const router = express.Router();

// Admin routes
router.post('/admin/refunds/ticket', authenticate, requireAdmin, refundController.refundTicket);
router.post('/admin/refunds/order', authenticate, requireAdmin, refundController.refundOrder);
router.get('/admin/orders/:orderId/refund-summary', authenticate, requireAdmin, refundController.getRefundSummary);

module.exports = router;

