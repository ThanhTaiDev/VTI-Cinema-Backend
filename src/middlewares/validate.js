/**
 * Validation middleware
 * Simple validation helpers (can be replaced with zod later)
 */

/**
 * Validate payment init request
 */
function validateInitPayment(req, res, next) {
  const { orderId, method, gatewayCode } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' });
  }

  if (method && !['qrcode', 'app', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Invalid method. Must be qrcode, app, or card' });
  }

  if (gatewayCode && typeof gatewayCode !== 'string') {
    return res.status(400).json({ error: 'gatewayCode must be a string' });
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

/**
 * Validate payment gateway payload
 */
function validatePaymentGatewayPayload(req, res, next) {
  const { name, code, feeType, feePercent, feeFixed, minFee, maxFee, vatOnFeePercent } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }

  if (code !== undefined && (typeof code !== 'string' || code.trim().length === 0)) {
    return res.status(400).json({ error: 'code must be a non-empty string' });
  }

  if (feeType && !['PERCENT', 'FIXED', 'MIXED'].includes(feeType)) {
    return res.status(400).json({ error: 'feeType must be PERCENT, FIXED, or MIXED' });
  }

  if (feePercent !== undefined && (typeof feePercent !== 'number' || feePercent < 0 || feePercent > 1)) {
    return res.status(400).json({ error: 'feePercent must be a number between 0 and 1' });
  }

  if (feeFixed !== undefined && (typeof feeFixed !== 'number' || feeFixed < 0)) {
    return res.status(400).json({ error: 'feeFixed must be a non-negative number' });
  }

  if (minFee !== undefined && (typeof minFee !== 'number' || minFee < 0)) {
    return res.status(400).json({ error: 'minFee must be a non-negative number' });
  }

  if (maxFee !== undefined && (typeof maxFee !== 'number' || maxFee < 0)) {
    return res.status(400).json({ error: 'maxFee must be a non-negative number' });
  }

  if (minFee !== undefined && maxFee !== undefined && minFee > maxFee) {
    return res.status(400).json({ error: 'maxFee must be greater than or equal to minFee' });
  }

  if (vatOnFeePercent !== undefined && (typeof vatOnFeePercent !== 'number' || vatOnFeePercent < 0 || vatOnFeePercent > 1)) {
    return res.status(400).json({ error: 'vatOnFeePercent must be a number between 0 and 1' });
  }

  // All fee fields are optional - no required field validation based on feeType
  // The computeFee function will handle default values appropriately

  next();
}

/**
 * Validate payment gateway preview fee request
 */
function validatePaymentGatewayPreview(req, res, next) {
  const { gatewayCode, amount, method } = req.body;

  if (!gatewayCode || typeof gatewayCode !== 'string') {
    return res.status(400).json({ error: 'gatewayCode is required and must be a string' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount is required and must be a positive number' });
  }

  if (method !== undefined && typeof method !== 'string') {
    return res.status(400).json({ error: 'method must be a string' });
  }

  next();
}

/**
 * Validate payment gateway lock request
 */
function validatePaymentGatewayLock(req, res, next) {
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'reason is required and must be a non-empty string' });
  }

  next();
}

module.exports = {
  validateInitPayment,
  validateRefund,
  validatePartialRefund,
  validateListPayments,
  validatePaymentGatewayPayload,
  validatePaymentGatewayPreview,
  validatePaymentGatewayLock,
};

