const prisma = require('../../prismaClient');
const { computeFee } = require('../../utils/fee/computeFee');

function normalizeCode(code) {
  return code ? String(code).trim().toLowerCase() : undefined;
}

function toNullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseJsonField(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
  throw new Error('Invalid JSON format');
}

function buildGatewayData(payload, { isUpdate = false } = {}) {
  const data = {};

  if (!isUpdate || payload.name !== undefined) {
    data.name = payload.name;
  }

  if (!isUpdate || payload.code !== undefined) {
    const normalized = normalizeCode(payload.code);
    if (normalized !== undefined) {
      data.code = normalized;
    }
  }

  if (!isUpdate || payload.enabled !== undefined) {
    if (payload.enabled !== undefined) {
      data.enabled = Boolean(payload.enabled);
    }
  }

  if (!isUpdate || payload.locked !== undefined) {
    if (payload.locked !== undefined) {
      data.locked = Boolean(payload.locked);
    }
  }

  if (!isUpdate || payload.lockedReason !== undefined) {
    if (payload.lockedReason === null || payload.lockedReason === undefined) {
      data.lockedReason = null;
    } else {
      data.lockedReason = String(payload.lockedReason);
    }
  }

  if (!isUpdate || payload.feeType !== undefined) {
    if (payload.feeType !== undefined) {
      data.feeType = String(payload.feeType).toUpperCase();
    }
  }

  if (!isUpdate || payload.feePercent !== undefined) {
    const value = toNullableNumber(payload.feePercent);
    if (value !== undefined) {
      data.feePercent = value;
    }
  }

  if (!isUpdate || payload.feeFixed !== undefined) {
    const value = toNullableNumber(payload.feeFixed);
    if (value !== undefined) {
      data.feeFixed = value !== null ? Math.round(value) : null;
    }
  }

  if (!isUpdate || payload.minFee !== undefined) {
    const value = toNullableNumber(payload.minFee);
    if (value !== undefined) {
      data.minFee = value !== null ? Math.round(value) : null;
    }
  }

  if (!isUpdate || payload.maxFee !== undefined) {
    const value = toNullableNumber(payload.maxFee);
    if (value !== undefined) {
      data.maxFee = value !== null ? Math.round(value) : null;
    }
  }

  if (!isUpdate || payload.vatOnFeePercent !== undefined) {
    const value = toNullableNumber(payload.vatOnFeePercent);
    if (value !== undefined) {
      data.vatOnFeePercent = value;
    }
  }

  if (!isUpdate || payload.methodOverrides !== undefined) {
    const parsed = parseJsonField(payload.methodOverrides);
    if (parsed !== undefined) {
      data.methodOverrides = parsed;
    }
  }

  if (!isUpdate || payload.rules !== undefined) {
    const parsed = parseJsonField(payload.rules);
    if (parsed !== undefined) {
      data.rules = parsed;
    }
  }

  if (!isUpdate || payload.configJson !== undefined) {
    if (payload.configJson === undefined) {
      // no change
    } else if (payload.configJson === null) {
      data.configJson = null;
    } else if (typeof payload.configJson === 'string') {
      data.configJson = payload.configJson;
    } else {
      data.configJson = JSON.stringify(payload.configJson);
    }
  }

  return data;
}

async function listGateways(filters = {}) {
  const where = {};

  if (filters.enabled !== undefined) {
    where.enabled = filters.enabled;
  }

  if (filters.code) {
    where.code = normalizeCode(filters.code);
  }

  if (filters.q) {
    const search = String(filters.q).trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toLowerCase() } },
      ];
    }
  }

  const gateways = await prisma.paymentGateway.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return gateways;
}

async function listAvailableGateways() {
  const gateways = await prisma.paymentGateway.findMany({
    where: {
      enabled: true,
      locked: false,
      lockedReason: null,
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      feeType: true,
      feePercent: true,
      feeFixed: true,
      minFee: true,
      maxFee: true,
      vatOnFeePercent: true,
    },
  });

  return gateways;
}

async function createGateway(payload) {
  const data = buildGatewayData(payload);
  if (!data.code) {
    throw new Error('Gateway code is required');
  }
  if (!data.name) {
    throw new Error('Gateway name is required');
  }
  return prisma.paymentGateway.create({ data });
}

async function updateGateway(id, payload) {
  const gatewayId = Number(id);
  if (!Number.isInteger(gatewayId)) {
    throw new Error('Invalid gateway id');
  }

  const data = buildGatewayData(payload, { isUpdate: true });

  return prisma.paymentGateway.update({
    where: { id: gatewayId },
    data,
  });
}

async function deleteGateway(id) {
  const gatewayId = Number(id);
  if (!Number.isInteger(gatewayId)) {
    throw new Error('Invalid gateway id');
  }

  return prisma.paymentGateway.delete({ where: { id: gatewayId } });
}

async function toggleGateway(id) {
  const gatewayId = Number(id);
  if (!Number.isInteger(gatewayId)) {
    throw new Error('Invalid gateway id');
  }

  const gateway = await prisma.paymentGateway.findUnique({ where: { id: gatewayId } });
  if (!gateway) {
    throw new Error('Gateway not found');
  }

  return prisma.paymentGateway.update({
    where: { id: gatewayId },
    data: {
      enabled: !gateway.enabled,
      ...(gateway.enabled ? {} : { lockedReason: null, locked: false }),
    },
  });
}

async function lockGateway(id, reason) {
  const gatewayId = Number(id);
  if (!Number.isInteger(gatewayId)) {
    throw new Error('Invalid gateway id');
  }

  return prisma.paymentGateway.update({
    where: { id: gatewayId },
    data: {
      locked: true,
      lockedReason: reason || 'Locked by admin',
    },
  });
}

async function unlockGateway(id) {
  const gatewayId = Number(id);
  if (!Number.isInteger(gatewayId)) {
    throw new Error('Invalid gateway id');
  }

  return prisma.paymentGateway.update({
    where: { id: gatewayId },
    data: {
      locked: false,
      lockedReason: null,
    },
  });
}

async function previewFee({ gatewayCode, amount, method }) {
  const code = normalizeCode(gatewayCode);
  const gateway = await prisma.paymentGateway.findFirst({ where: { code } });

  if (!gateway) {
    throw new Error('Gateway not found');
  }

  const result = computeFee(gateway, amount, method);

  return {
    gateway: gateway.code,
    fee: result.fee, // Total fee merchant pays
    feeBase: result.feeBase, // Base fee merchant pays
    vatSurcharge: result.vatSurcharge || 0, // VAT customer pays (if vatOnFeePercent > 0)
    amountCharged: result.amountCharged || amount, // Total amount customer pays
    net: result.net, // Net amount merchant receives
    breakdown: result.breakdown,
  };
}

module.exports = {
  listGateways,
  listAvailableGateways,
  createGateway,
  updateGateway,
  deleteGateway,
  toggleGateway,
  lockGateway,
  unlockGateway,
  previewFee,
};

