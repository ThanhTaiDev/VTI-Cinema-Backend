const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * Credit Card Payment Gateway (Stub)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 * TODO: Implement actual Credit Card API integration (Stripe, PayPal, etc.)
 */
class CreditCardService extends BaseGateway {
  constructor() {
    super();
    this.code = 'card';
    this.displayName = 'Credit Card';
    this.supportsPartialRefund = true; // Credit cards usually support partial refunds
    this.secretKey = process.env.CREDIT_CARD_SECRET_KEY || '';
    this.endpoint = process.env.CREDIT_CARD_ENDPOINT || 'https://sandbox.payment-processor.com/';
  }

  /**
   * Create payment (stub)
   */
  async createPayment({ order, amount, meta = {} }) {
    // TODO: Implement actual Credit Card API call
    const providerRef = `CARD-${order.id}-${Date.now()}`;
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
          console.log('[CreditCard Webhook] DEV MODE: Allowing webhook without signature');
          return { ok: true };
        }
      }
      
      // TODO: Implement actual Credit Card signature verification
      const signature = headers['x-signature'] || headers['signature'] || '';
      
      if (!signature) {
        return { ok: false, reason: 'Missing signature' };
      }

      // Stub verification - in production, verify with payment processor's algorithm
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
      providerTxId: data.transId || data.transactionId || data.id || `CARD-${Date.now()}`,
      status: data.status === 'succeeded' || data.status === 'SUCCESS' || data.resultCode === 0 ? 'SUCCESS' : 'FAILED',
      amount: data.amount || 0,
      raw: data,
    };
  }

  /**
   * Refund payment (stub)
   */
  async refund({ payment, amount, reason }) {
    // TODO: Implement actual Credit Card refund API
    const providerRefundId = `REFUND-CARD-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = CreditCardService;

