const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * PayPal Payment Gateway (Stub)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 * This is a simulated PayPal payment flow for demonstration purposes only.
 * In production, integrate with actual PayPal REST API.
 */
class PayPalService extends BaseGateway {
  constructor() {
    super();
    this.code = 'paypal';
    this.displayName = 'PayPal';
    this.supportsPartialRefund = true; // PayPal supports partial refunds
    this.secretKey = process.env.PAYPAL_SECRET_KEY || 'demo-paypal-secret-key';
    this.clientId = process.env.PAYPAL_CLIENT_ID || 'demo-paypal-client-id';
    this.endpoint = process.env.PAYPAL_ENDPOINT || 'https://api.sandbox.paypal.com/';
  }

  /**
   * Create payment (stub)
   * In real PayPal flow, this would create a PayPal order via REST API
   */
  async createPayment({ order, amount, meta = {} }) {
    // DEMO ONLY - Simulate PayPal order creation
    const providerRef = `PAYPAL-${order.id}-${Date.now()}`;
    
    // In real flow, PayPal would return an approval URL
    // For demo, we redirect to our own PayPal login page
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${meta.paymentId}/gateway/paypal`;
    
    return {
      redirectUrl,
      providerRef,
      requiresPayPalLogin: true, // Indicate that user needs to login to PayPal
    };
  }

  /**
   * Verify webhook signature (stub)
   * DEMO ONLY - DO NOT USE IN PRODUCTION
   * In production, verify using PayPal's webhook signature verification algorithm
   */
  async verifyWebhook({ headers, body }) {
    try {
      // In dev mode, allow webhooks without signature for easier testing
      if (process.env.NODE_ENV !== 'production') {
        const signature = headers['x-signature'] || headers['signature'] || headers['x-paypal-signature'] || '';
        if (!signature) {
          console.log('[PayPal Webhook] DEV MODE: Allowing webhook without signature');
          return { ok: true };
        }
      }
      
      // TODO: Implement actual PayPal webhook signature verification
      // PayPal uses a specific algorithm with certificate chain validation
      const signature = headers['x-paypal-signature'] || headers['x-signature'] || headers['signature'] || '';
      
      if (!signature) {
        return { ok: false, reason: 'Missing signature' };
      }

      // Stub verification - in production, verify with PayPal's algorithm
      const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(payloadString)
        .digest('hex');
      
      if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
        return { ok: false, reason: 'Invalid signature' };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  /**
   * Parse webhook payload (stub)
   * In production, parse PayPal webhook events (PAYMENT.SALE.COMPLETED, etc.)
   */
  async parseWebhook({ headers, body }) {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    
    // PayPal webhook events have different structure
    // For demo, accept common status formats
    let status = 'FAILED';
    if (data.event_type === 'PAYMENT.SALE.COMPLETED' || 
        data.resource?.state === 'completed' ||
        data.status === 'COMPLETED' ||
        data.status === 'SUCCESS' ||
        data.status === 'succeeded') {
      status = 'SUCCESS';
    }
    
    return {
      providerTxId: data.id || data.resource?.id || data.transaction_id || `PAYPAL-${Date.now()}`,
      status,
      amount: data.resource?.amount?.total || data.amount || 0,
      raw: data,
    };
  }

  /**
   * Refund payment (stub)
   * In production, use PayPal REST API to create refund
   */
  async refund({ payment, amount, reason }) {
    // TODO: Implement actual PayPal refund API
    // PayPal supports full and partial refunds via REST API
    const providerRefundId = `REFUND-PAYPAL-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = PayPalService;

