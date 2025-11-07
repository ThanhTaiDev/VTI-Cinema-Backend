const rateLimit = require('express-rate-limit');

/**
 * Rate limit for payment endpoints
 * 60 requests per minute per IP
 */
const rateLimitPayment = rateLimit({
  windowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX) || 100, // Increased to 100 requests for dev
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development if needed
  skip: (req) => {
    // Allow more requests in development
    return process.env.NODE_ENV === 'development' && false; // Set to true to disable in dev
  },
});

module.exports = rateLimitPayment;

