/**
 * Mask sensitive data for logging
 */

/**
 * Mask credit card number (PAN)
 * @param {string} pan - Card number
 * @returns {string} - Masked card number (e.g., 1234****5678)
 */
function maskPAN(pan) {
  if (!pan || typeof pan !== 'string') return pan;
  if (pan.length < 8) return '****';
  return pan.substring(0, 4) + '****' + pan.substring(pan.length - 4);
}

/**
 * Mask email (show first 2 chars and domain)
 * @param {string} email - Email address
 * @returns {string} - Masked email (e.g., ab***@example.com)
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Mask token (show first 4 and last 4 chars)
 * @param {string} token - Token string
 * @returns {string} - Masked token
 */
function maskToken(token) {
  if (!token || typeof token !== 'string') return token;
  if (token.length < 8) return '****';
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

/**
 * Mask object recursively
 * @param {object} obj - Object to mask
 * @param {string[]} fields - Fields to mask (default: ['card', 'pan', 'cvv', 'token', 'secret', 'password'])
 * @returns {object} - Masked object
 */
function maskObject(obj, fields = ['card', 'pan', 'cvv', 'token', 'secret', 'password', 'accessKey', 'secretKey']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    
    if (fields.some(f => lowerKey.includes(f))) {
      if (typeof masked[key] === 'string') {
        if (lowerKey.includes('email')) {
          masked[key] = maskEmail(masked[key]);
        } else if (lowerKey.includes('pan') || lowerKey.includes('card')) {
          masked[key] = maskPAN(masked[key]);
        } else {
          masked[key] = maskToken(masked[key]);
        }
      }
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskObject(masked[key], fields);
    }
  }
  
  return masked;
}

module.exports = {
  maskPAN,
  maskEmail,
  maskToken,
  maskObject,
};

