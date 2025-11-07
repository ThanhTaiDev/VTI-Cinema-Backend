const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * ZaloPay Payment Gateway (Stub)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 * TODO: Implement actual ZaloPay API integration
 */
class ZaloPayService extends BaseGateway {
  constructor() {
    super();
    this.code = 'zalopay';
    this.displayName = 'Zalo Pay';
    this.supportsPartialRefund = false;
    this.secretKey = process.env.ZALOPAY_SECRET_KEY || '';
    this.endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sandbox.zalopay.vn/';
  }

  /**
   * Create payment (stub)
   */
  async createPayment({ order, amount, meta = {} }) {
    // TODO: Implement actual ZaloPay API call
    const providerRef = `ZALOPAY-${order.id}-${Date.now()}`;
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
          console.log('[ZaloPay Webhook] DEV MODE: Allowing webhook without signature');
          return { ok: true };
        }
      }
      
      // TODO: Implement actual ZaloPay signature verification
      const signature = headers['x-signature'] || headers['signature'] || '';
      
      if (!signature) {
        return { ok: false, reason: 'Missing signature' };
      }

      // Stub verification - in production, verify with ZaloPay's algorithm
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
      providerTxId: data.transId || data.orderId || data.transactionId || `ZALOPAY-${Date.now()}`,
      status: data.resultCode === 0 || data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      amount: data.amount || 0,
      raw: data,
    };
  }

  /**
   * Refund payment (stub)
   */
  async refund({ payment, amount, reason }) {
    // TODO: Implement actual ZaloPay refund API
    const providerRefundId = `REFUND-ZALOPAY-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = ZaloPayService;

