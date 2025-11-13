const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');
const refundController = require('../controllers/refundController');

const router = express.Router();

// Admin routes
router.post('/admin/refunds/ticket', authenticate, authorize(PERMISSIONS.TICKETS_REFUND), refundController.refundTicket);
router.post('/admin/refunds/order', authenticate, authorize(PERMISSIONS.PAYMENTS_REFUND), refundController.refundOrder);
router.get('/admin/orders/:orderId/refund-summary', authenticate, authorize(PERMISSIONS.PAYMENTS_VIEW), refundController.getRefundSummary);

module.exports = router;

