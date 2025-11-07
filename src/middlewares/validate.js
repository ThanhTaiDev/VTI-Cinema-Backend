/**
 * Validation middleware
 * Simple validation helpers (can be replaced with zod later)
 */

/**
 * Validate payment init request
 */
function validateInitPayment(req, res, next) {
  const { orderId, method } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  if (method && !['qrcode', 'app', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Invalid method. Must be qrcode, app, or card' });
  }

  next();
}

/**
 * Validate refund request
 */
function validateRefund(req, res, next) {
  const { reason } = req.body;

  if (reason && typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason must be a string' });
  }

  next();
}

/**
 * Validate partial refund request
 */
function validatePartialRefund(req, res, next) {
  const { amount, reason } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount is required and must be greater than 0' });
  }

  if (reason && typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason must be a string' });
  }

  next();
}

/**
 * Validate list payments query
 */
function validateListPayments(req, res, next) {
  const { from, to, page, pageSize } = req.query;

  // Validate dates
  if (from && isNaN(Date.parse(from))) {
    return res.status(400).json({ error: 'Invalid from date format' });
  }

  if (to && isNaN(Date.parse(to))) {
    return res.status(400).json({ error: 'Invalid to date format' });
  }

  // Validate pagination
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({ error: 'page must be a positive integer' });
  }

  if (pageSize && (isNaN(pageSize) || parseInt(pageSize) < 1 || parseInt(pageSize) > 100)) {
    return res.status(400).json({ error: 'pageSize must be between 1 and 100' });
  }

  next();
}

module.exports = {
  validateInitPayment,
  validateRefund,
  validatePartialRefund,
  validateListPayments,
};

