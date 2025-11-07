const BaseGateway = require('./BaseGateway');
const crypto = require('crypto');

/**
 * VNPay Payment Gateway (Stub)
 * TODO: Implement actual VNPay API integration
 */
class VNPayService extends BaseGateway {
  constructor() {
    super();
    this.code = 'vnpay';
    this.displayName = 'VNPay';
    this.supportsPartialRefund = false;
    this.tmnCode = process.env.VNPAY_TMN_CODE || '';
    this.hashSecret = process.env.VNPAY_HASH_SECRET || '';
    this.endpoint = process.env.VNPAY_ENDPOINT || 'https://sandbox.vnpayment.vn/';
  }

  /**
   * Create payment (stub)
   */
  async createPayment({ order, amount, meta = {} }) {
    // TODO: Implement actual VNPay API call
    const providerRef = `VNPAY-${order.id}-${Date.now()}`;
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback?providerRef=${providerRef}&orderId=${order.id}`;
    
    return {
      redirectUrl,
      providerRef,
    };
  }

  /**
   * Verify webhook signature (stub)
   */
  async verifyWebhook({ headers, body }) {
    try {
      // TODO: Implement actual VNPay signature verification
      const signature = headers['vnp_SecureHash'] || headers['signature'] || '';
      
      if (!signature) {
        return { ok: false, reason: 'Missing signature' };
      }

      // Stub verification - in production, verify with VNPay's algorithm
      const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha512', this.hashSecret)
        .update(payloadString)
        .digest('hex');
      
      if (signature !== expectedSignature) {
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
      providerTxId: data.vnp_TransactionNo || data.transactionNo || `VNPAY-${Date.now()}`,
      status: data.vnp_ResponseCode === '00' ? 'SUCCESS' : 'FAILED',
      amount: data.vnp_Amount ? parseInt(data.vnp_Amount) / 100 : 0, // VNPay uses cents
      raw: data,
    };
  }

  /**
   * Refund payment (stub)
   */
  async refund({ payment, amount, reason }) {
    // TODO: Implement actual VNPay refund API
    const providerRefundId = `REFUND-VNPAY-${payment.id}-${Date.now()}`;
    
    return {
      providerRefundId,
      status: 'SUCCESS',
    };
  }
}

module.exports = VNPayService;

