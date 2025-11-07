const express = require('express');
const rateLimitPayment = require('../middlewares/rateLimitPayment');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validateInitPayment, validateRefund, validatePartialRefund, validateListPayments, validatePaymentGatewayPayload, validatePaymentGatewayPreview, validatePaymentGatewayLock } = require('../middlewares/validate');
const paymentController = require('../services/payments/payment.controller');
const webhookController = require('../services/payments/webhook.controller');
const refundController = require('../services/payments/refund.controller');
const paymentGatewayController = require('../services/payments/paymentGateway.controller');

const router = express.Router();

// Admin routes - List, detail, export
router.get('/admin/payments', authenticate, requireAdmin, validateListPayments, rateLimitPayment, paymentController.listPayments);
router.get('/admin/payments/:id', authenticate, requireAdmin, rateLimitPayment, paymentController.getPaymentDetail);
router.get('/admin/payments/export/csv', authenticate, requireAdmin, rateLimitPayment, paymentController.exportCSV);

// User routes - Payment operations
router.post('/payments/init', authenticate, validateInitPayment, rateLimitPayment, paymentController.initPayment);
router.get('/payments/:id', authenticate, rateLimitPayment, paymentController.getPaymentById);
router.post('/payments/:id/charge-card', authenticate, rateLimitPayment, paymentController.chargeCard);

// Admin routes - Refund
router.post('/admin/payments/:id/refund', authenticate, requireAdmin, validateRefund, rateLimitPayment, refundController.refundFull);
router.post('/admin/payments/:id/refund/partial', authenticate, requireAdmin, validatePartialRefund, rateLimitPayment, refundController.refundPartial);

// Public route - Webhook (no auth required)
router.post('/payments/webhook/:gateway', rateLimitPayment, webhookController.receiveWebhook);

// Public route - Get available payment gateways (for payment page)
router.get('/payment-gateways/available', paymentGatewayController.getAvailableGateways);
// Public route - Preview fee (for payment page)
router.post('/payment-gateways/preview-fee', validatePaymentGatewayPreview, rateLimitPayment, paymentGatewayController.previewFee);

// Admin routes - Payment Gateway Management
router.get('/admin/payment-gateways', authenticate, requireAdmin, rateLimitPayment, paymentGatewayController.listGateways);
router.post('/admin/payment-gateways', authenticate, requireAdmin, validatePaymentGatewayPayload, rateLimitPayment, paymentGatewayController.createGateway);
router.put('/admin/payment-gateways/:id', authenticate, requireAdmin, validatePaymentGatewayPayload, rateLimitPayment, paymentGatewayController.updateGateway);
router.delete('/admin/payment-gateways/:id', authenticate, requireAdmin, rateLimitPayment, paymentGatewayController.deleteGateway);
router.post('/admin/payment-gateways/:id/toggle', authenticate, requireAdmin, rateLimitPayment, paymentGatewayController.toggleGateway);
router.post('/admin/payment-gateways/:id/lock', authenticate, requireAdmin, validatePaymentGatewayLock, rateLimitPayment, paymentGatewayController.lockGateway);
router.post('/admin/payment-gateways/:id/unlock', authenticate, requireAdmin, rateLimitPayment, paymentGatewayController.unlockGateway);
router.post('/admin/payment-gateways/preview-fee', authenticate, requireAdmin, validatePaymentGatewayPreview, rateLimitPayment, paymentGatewayController.previewFee);

module.exports = router;

