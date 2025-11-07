const crypto = require('crypto');

/**
 * HMAC Utilities
 */

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} - HMAC signature
 */
function generateHMAC(data, secret, algorithm = 'sha256') {
  return crypto
    .createHmac(algorithm, secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Data to verify
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {boolean} - True if signature is valid
 */
function verifyHMAC(data, signature, secret, algorithm = 'sha256') {
  const expected = generateHMAC(data, secret, algorithm);
  // Simple comparison for now (timingSafeEqual requires same length buffers)
  if (signature.length !== expected.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch (e) {
    // Fallback to simple comparison if timingSafeEqual fails
    return signature === expected;
  }
}

module.exports = {
  generateHMAC,
  verifyHMAC,
};

