/**
 * Base Gateway Interface
 * All payment gateways must extend this class
 */
class BaseGateway {
  code = "base";
  displayName = "Base Gateway";
  supportsPartialRefund = false;

  /**
   * Create payment and return redirect URL or QR code
   * @param {Object} params - { order, amount, meta }
   * @returns {Promise<{redirectUrl?: string, qrCode?: string, providerRef: string}>}
   */
  async createPayment({ order, amount, meta = {} }) {
    throw new Error("createPayment() must be implemented");
  }

  /**
   * Verify webhook signature
   * @param {Object} params - { headers, body }
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  async verifyWebhook({ headers, body }) {
    return { ok: false, reason: "not-implemented" };
  }

  /**
   * Parse webhook payload to extract payment info
   * @param {Object} params - { headers, body }
   * @returns {Promise<{providerTxId: string, status: string, amount: number, raw: object}>}
   */
  async parseWebhook({ headers, body }) {
    return {
      providerTxId: null,
      status: "FAILED",
      amount: 0,
      raw: {},
    };
  }

  /**
   * Refund payment
   * @param {Object} params - { payment, amount, reason }
   * @returns {Promise<{providerRefundId: string, status: string}>}
   */
  async refund({ payment, amount, reason }) {
    throw new Error("refund() must be implemented");
  }
}

module.exports = BaseGateway;

