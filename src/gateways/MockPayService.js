const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * Mock Payment Gateway
 * For development and testing
 */
class MockPayService extends BaseGateway {
  constructor() {
    super();
    this.code = 'mock';
    this.displayName = 'Mock Payment';
    this.supportsPartialRefund = true;
    this.secretKey = process.env.MOCK_PAY_SECRET || 'mock-secret-key-change-in-production';
  }

  /**
   * Create payment
   */
  async createPayment({ order, amount, meta = {} }) {
    const providerRef = `MOCK-${order.id}-${Date.now()}`;
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback?providerRef=${providerRef}&orderId=${order.id}`;
    
    return {
      redirectUrl,
      providerRef,
    };
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook({ headers, body }) {
    try {
      const signature = headers['x-signature'] || headers['signature'] || '';
      
      // In dev mode, allow webhooks without signature for easier testing
      if (process.env.NODE_ENV !== 'production' && !signature) {
        return { ok: true };
      }
      
      // If signature is provided, verify it
      if (signature) {
        const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
        const expectedSignature = crypto
          .createHmac('sha256', this.secretKey)
          .update(payloadString)
          .digest('hex');
        
        if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
          return { ok: false, reason: 'Invalid signature' };
        }
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message };
    }
  }

  /**
   * Parse webhook payload
   */
  async parseWebhook({ headers, body }) {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    
    // Extract providerTxId from providerRef or orderId
    const providerTxId = data.providerTxId || data.providerRef || data.paymentId || `MOCK-${Date.now()}`;
    
    return {
      providerTxId,
      status: data.status || 'SUCCESS',
      amount: data.amount || 0,
      fee: data.fee || 0,
      raw: data,
    };
  }

  /**
   * Refund payment
   */
  async refund({ payment, amount, reason }) {
    // Mock refund - always succeeds
    const providerRefundId = `REFUND-MOCK-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = MockPayService;

