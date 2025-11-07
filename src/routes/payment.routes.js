const express = require('express');
const rateLimitPayment = require('../middlewares/rateLimitPayment');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validateInitPayment, validateRefund, validatePartialRefund, validateListPayments } = require('../middlewares/validate');
const paymentController = require('../services/payments/payment.controller');
const webhookController = require('../services/payments/webhook.controller');
const refundController = require('../services/payments/refund.controller');

const router = express.Router();

// Admin routes - List, detail, export
router.get('/admin/payments', authenticate, requireAdmin, validateListPayments, rateLimitPayment, paymentController.listPayments);
router.get('/admin/payments/:id', authenticate, requireAdmin, rateLimitPayment, paymentController.getPaymentDetail);
router.get('/admin/payments/export/csv', authenticate, requireAdmin, rateLimitPayment, paymentController.exportCSV);

// User route - Initialize payment
router.post('/payments/init', authenticate, validateInitPayment, rateLimitPayment, paymentController.initPayment);

// Admin routes - Refund
router.post('/admin/payments/:id/refund', authenticate, requireAdmin, validateRefund, rateLimitPayment, refundController.refundFull);
router.post('/admin/payments/:id/refund/partial', authenticate, requireAdmin, validatePartialRefund, rateLimitPayment, refundController.refundPartial);

// Public route - Webhook (no auth required)
router.post('/payments/webhook/:gateway', rateLimitPayment, webhookController.receiveWebhook);

module.exports = router;

