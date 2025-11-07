function roundCurrency(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function normalizeMethod(method) {
  if (!method) return null;
  return String(method).toLowerCase();
}

function resolveOverrides(gateway, method) {
  if (!method || !gateway || !gateway.methodOverrides) {
    return {};
  }

  const overrides = gateway.methodOverrides;
  const lookupKeys = [method, method.toUpperCase(), method.toLowerCase()];
  for (const key of lookupKeys) {
    if (key && Object.prototype.hasOwnProperty.call(overrides, key)) {
      const candidate = overrides[key];
      if (isPlainObject(candidate)) {
        return candidate;
      }
      return {}; // Non-object overrides ignored
    }
  }
  return {};
}

/**
 * Compute gateway fee and net amount for a payment
 * @param {Object} gateway - PaymentGateway record
 * @param {number} amount - total amount in VND
 * @param {string} [method]
 * @returns {{ fee: number, net: number, breakdown: { feeBase: number, feeVat: number, minCap?: number, maxCap?: number } }}
 */
function computeFee(gateway, amount, method) {
  if (!gateway) {
    throw new Error('Gateway configuration is required');
  }

  const totalAmount = Number(amount) || 0;
  if (totalAmount <= 0) {
    return { fee: 0, net: 0, breakdown: { feeBase: 0, feeVat: 0 } };
  }

  const normalizedMethod = normalizeMethod(method);
  const overrides = resolveOverrides(gateway, normalizedMethod || undefined);

  const feeType = (overrides.feeType || gateway.feeType || 'PERCENT').toUpperCase();
  const feePercent = overrides.feePercent ?? gateway.feePercent ?? 0;
  const feeFixed = overrides.feeFixed ?? gateway.feeFixed ?? 0;
  const minFee = overrides.minFee ?? gateway.minFee;
  const maxFee = overrides.maxFee ?? gateway.maxFee;
  const vatOnFeePercent = overrides.vatOnFeePercent ?? gateway.vatOnFeePercent ?? 0;

  let feeBase = 0;

  switch (feeType) {
    case 'FIXED':
      feeBase = Number(feeFixed) || 0;
      break;
    case 'MIXED':
      feeBase = totalAmount * (Number(feePercent) || 0) + (Number(feeFixed) || 0);
      break;
    case 'PERCENT':
    default:
      feeBase = totalAmount * (Number(feePercent) || 0);
      break;
  }

  let minCap;
  let maxCap;

  if (typeof minFee === 'number' && !Number.isNaN(minFee) && feeBase < minFee) {
    feeBase = minFee;
    minCap = minFee;
  }

  if (typeof maxFee === 'number' && !Number.isNaN(maxFee) && maxFee >= 0 && feeBase > maxFee) {
    feeBase = maxFee;
    maxCap = maxFee;
  }

  const feeVat = feeBase * (Number(vatOnFeePercent) || 0);
  const feeTotal = roundCurrency(feeBase + feeVat);
  const net = Math.max(0, roundCurrency(totalAmount) - feeTotal);

  return {
    fee: feeTotal,
    net,
    breakdown: {
      feeBase: roundCurrency(feeBase),
      feeVat: roundCurrency(feeVat),
      ...(minCap !== undefined ? { minCap: roundCurrency(minCap) } : {}),
      ...(maxCap !== undefined ? { maxCap: roundCurrency(maxCap) } : {}),
    },
  };
}

module.exports = {
  computeFee,
  roundCurrency,
};

