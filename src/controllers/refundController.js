const refundService = require('../services/refunds/refund.service');

/**
 * Refund a single ticket
 */
exports.refundTicket = async (req, res, next) => {
  try {
    const { ticketId, reason } = req.body;
    const actorId = req.user.id;

    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const result = await refundService.refundTicket({
      ticketId,
      reason,
      actorId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Refund entire order
 */
exports.refundOrder = async (req, res, next) => {
  try {
    const { orderId, reason } = req.body;
    const actorId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const result = await refundService.refundOrder({
      orderId,
      reason,
      actorId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get refund summary for an order
 */
exports.getRefundSummary = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const summary = await refundService.getRefundSummary(orderId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

