const PaymentProvider = require('./interface');
const crypto = require('crypto');

/**
 * Mock Payment Provider
 * For development and testing
 */
class MockPayProvider extends PaymentProvider {
  constructor() {
    super();
    this.secretKey = process.env.MOCK_PAY_SECRET || 'mock-secret-key-change-in-production';
  }

  /**
   * Initialize payment
   */
  async initPayment(order) {
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
  async verifyWebhook(payload, signature) {
    // Generate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payloadString)
      .digest('hex');
    
    // Verify signature
    if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
      throw new Error('Invalid webhook signature');
    }

    // Parse payload
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    return {
      orderId: data.orderId,
      paymentId: data.paymentId || data.providerRef,
      status: data.status || 'SUCCESS',
      amount: data.amount,
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    // Mock implementation - always return PAID for testing
    return {
      status: 'PAID',
      amount: 0, // Amount not available in mock
    };
  }
}

module.exports = MockPayProvider;

