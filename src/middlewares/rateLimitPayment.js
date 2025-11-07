const rateLimit = require('express-rate-limit');

/**
 * Rate limit for payment endpoints
 * 60 requests per minute per IP
 */
const rateLimitPayment = rateLimit({
  windowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX) || 60, // 60 requests
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimitPayment;

