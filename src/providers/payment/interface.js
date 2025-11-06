/**
 * Payment Provider Interface
 * All payment providers must implement this interface
 */
class PaymentProvider {
  /**
   * Initialize payment and return redirect URL
   * @param {Object} order - Order object
   * @returns {Promise<{redirectUrl: string, providerRef: string}>}
   */
  async initPayment(order) {
    throw new Error('initPayment() must be implemented');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from webhook headers
   * @returns {Promise<{orderId: string, paymentId: string, status: string, amount: number}>}
   */
  async verifyWebhook(payload, signature) {
    throw new Error('verifyWebhook() must be implemented');
  }

  /**
   * Get payment status from provider
   * @param {string} paymentId - Payment ID from provider
   * @returns {Promise<{status: string, amount: number}>}
   */
  async getPaymentStatus(paymentId) {
    throw new Error('getPaymentStatus() must be implemented');
  }
}

module.exports = PaymentProvider;

