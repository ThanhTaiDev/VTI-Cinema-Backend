const webhookService = require('./webhook.service');

/**
 * Receive webhook from payment gateway
 */
async function receiveWebhook(req, res, next) {
  try {
    const { gateway } = req.params;
    const headers = req.headers;
    const body = req.body;

    const result = await webhookService.receiveWebhook({
      gateway,
      headers,
      body,
    });

    // Always return 200 OK to prevent gateway retries
    res.status(200).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    // Log error but still return 200 OK
    console.error('[Webhook] Error processing webhook:', error);
    res.status(200).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
}

module.exports = {
  receiveWebhook,
};

