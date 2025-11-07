const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * Payoo Payment Gateway (Stub)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 * TODO: Implement actual Payoo API integration
 */
class PayooService extends BaseGateway {
  constructor() {
    super();
    this.code = 'payoo';
    this.displayName = 'Payoo';
    this.supportsPartialRefund = false;
    this.secretKey = process.env.PAYOO_SECRET_KEY || '';
    this.endpoint = process.env.PAYOO_ENDPOINT || 'https://sandbox.payoo.vn/';
  }

  /**
   * Create payment (stub)
   */
  async createPayment({ order, amount, meta = {} }) {
    // TODO: Implement actual Payoo API call
    const providerRef = `PAYOO-${order.id}-${Date.now()}`;
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback?providerRef=${providerRef}&orderId=${order.id}`;
    
    return {
      redirectUrl,
      providerRef,
    };
  }

  /**
   * Verify webhook signature (stub)
   * DEMO ONLY - DO NOT USE IN PRODUCTION
   */
  async verifyWebhook({ headers, body }) {
    try {
      // In dev mode, allow webhooks without signature for easier testing
      if (process.env.NODE_ENV !== 'production') {
        const signature = headers['x-signature'] || headers['signature'] || '';
        // If no signature provided, allow it in dev mode
        if (!signature) {
          console.log('[Payoo Webhook] DEV MODE: Allowing webhook without signature');
          return { ok: true };
        }
      }
      
      // TODO: Implement actual Payoo signature verification
      const signature = headers['x-signature'] || headers['signature'] || '';
      
      if (!signature) {
        return { ok: false, reason: 'Missing signature' };
      }

      // Stub verification - in production, verify with Payoo's algorithm
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
   */
  async parseWebhook({ headers, body }) {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    
    return {
      providerTxId: data.transId || data.orderId || data.transactionId || `PAYOO-${Date.now()}`,
      status: data.resultCode === 0 || data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      amount: data.amount || 0,
      raw: data,
    };
  }

  /**
   * Refund payment (stub)
   */
  async refund({ payment, amount, reason }) {
    // TODO: Implement actual Payoo refund API
    const providerRefundId = `REFUND-PAYOO-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = PayooService;

