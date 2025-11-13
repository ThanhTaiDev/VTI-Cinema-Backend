const express = require('express');
const rateLimitPayment = require('../middlewares/rateLimitPayment');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');
const { validateInitPayment, validateRefund, validatePartialRefund, validateListPayments, validatePaymentGatewayPayload, validatePaymentGatewayPreview, validatePaymentGatewayLock } = require('../middlewares/validate');
const paymentController = require('../services/payments/payment.controller');
const webhookController = require('../services/payments/webhook.controller');
const refundController = require('../services/payments/refund.controller');
const paymentGatewayController = require('../services/payments/paymentGateway.controller');

const router = express.Router();

// Admin routes - List, detail, export
router.get('/admin/payments', authenticate, authorize(PERMISSIONS.PAYMENTS_VIEW), validateListPayments, rateLimitPayment, paymentController.listPayments);
router.get('/admin/payments/:id', authenticate, authorize(PERMISSIONS.PAYMENTS_VIEW), rateLimitPayment, paymentController.getPaymentDetail);
router.get('/admin/payments/export/csv', authenticate, authorize(PERMISSIONS.PAYMENTS_EXPORT), rateLimitPayment, paymentController.exportCSV);

// User routes - Payment operations
router.post('/payments/init', authenticate, validateInitPayment, rateLimitPayment, paymentController.initPayment);
router.get('/payments/:id', authenticate, rateLimitPayment, paymentController.getPaymentById);
router.post('/payments/:id/charge-card', authenticate, rateLimitPayment, paymentController.chargeCard);
router.post('/payments/:id/charge-paypal', authenticate, rateLimitPayment, paymentController.chargePayPal);

// Admin routes - Refund
router.post('/admin/payments/:id/refund', authenticate, authorize(PERMISSIONS.PAYMENTS_REFUND), validateRefund, rateLimitPayment, refundController.refundFull);
router.post('/admin/payments/:id/refund/partial', authenticate, authorize(PERMISSIONS.PAYMENTS_REFUND), validatePartialRefund, rateLimitPayment, refundController.refundPartial);

// Public route - Webhook (no auth required)
router.post('/payments/webhook/:gateway', rateLimitPayment, webhookController.receiveWebhook);

// Public route - Get available payment gateways (for payment page)
router.get('/payment-gateways/available', paymentGatewayController.getAvailableGateways);
// Public route - Preview fee (for payment page)
router.post('/payment-gateways/preview-fee', validatePaymentGatewayPreview, rateLimitPayment, paymentGatewayController.previewFee);

// Admin routes - Payment Gateway Management
router.get('/admin/payment-gateways', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), rateLimitPayment, paymentGatewayController.listGateways);
router.post('/admin/payment-gateways', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), validatePaymentGatewayPayload, rateLimitPayment, paymentGatewayController.createGateway);
router.put('/admin/payment-gateways/:id', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), validatePaymentGatewayPayload, rateLimitPayment, paymentGatewayController.updateGateway);
router.delete('/admin/payment-gateways/:id', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), rateLimitPayment, paymentGatewayController.deleteGateway);
router.post('/admin/payment-gateways/:id/toggle', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), rateLimitPayment, paymentGatewayController.toggleGateway);
router.post('/admin/payment-gateways/:id/lock', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), validatePaymentGatewayLock, rateLimitPayment, paymentGatewayController.lockGateway);
router.post('/admin/payment-gateways/:id/unlock', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), rateLimitPayment, paymentGatewayController.unlockGateway);
router.post('/admin/payment-gateways/preview-fee', authenticate, authorize(PERMISSIONS.PAYMENTS_GATEWAY_CONFIG), validatePaymentGatewayPreview, rateLimitPayment, paymentGatewayController.previewFee);

module.exports = router;

