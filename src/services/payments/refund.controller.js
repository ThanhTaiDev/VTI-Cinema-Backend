const refundService = require('./refund.service');

/**
 * Full refund
 */
async function refundFull(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await refundService.refundFull(id, reason);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Partial refund
 */
async function refundPartial(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount is required and must be greater than 0' });
    }

    const result = await refundService.refundPartial(id, amount, reason);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  refundFull,
  refundPartial,
};

