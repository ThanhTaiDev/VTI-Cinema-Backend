const prisma = require('../../prismaClient');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');

/**
 * Select payment gateway based on order, amount, and user
 * @param {Object} params - { order, amount, user, method }
 * @returns {Promise<Object>} - { record: PaymentGateway, instance: GatewayInstance }
 */
async function selectGateway({ order, amount, user, method }) {
  // Get all gateways from database
  const allGateways = await prisma.paymentGateway.findMany({
    orderBy: { code: 'asc' },
  });

  let selectedGatewayRecord = null;
  let selectedGatewayInstance = null;

  // Simple routing logic:
  // - Amount < 2,000,000 VND → MoMo
  // - Amount >= 2,000,000 VND → VNPay
  // - Fallback to mock for dev
  let preferredCode = 'mock';

  if (amount < 2000000) {
    preferredCode = 'momo';
  } else {
    preferredCode = 'vnpay';
  }

  // Try to find the preferred gateway
  selectedGatewayRecord = allGateways.find(g => g.code === preferredCode);

  // If preferred gateway is not found or not available, try other enabled gateways
  if (!selectedGatewayRecord || !selectedGatewayRecord.enabled || selectedGatewayRecord.locked) {
    const availableGateways = allGateways.filter(g => g.enabled && !g.locked);
    if (availableGateways.length > 0) {
      selectedGatewayRecord = availableGateways.find(g => g.code === preferredCode) || availableGateways[0];
    } else {
      // Fallback to mock if no other gateways are available
      selectedGatewayRecord = allGateways.find(g => g.code === 'mock');
    }
  }

  if (!selectedGatewayRecord) {
    throw new Error('No payment gateway available');
  }

  // Handle disabled/locked gateways
  if (!selectedGatewayRecord.enabled || selectedGatewayRecord.locked) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Payment gateway ${selectedGatewayRecord.name} is unavailable.`);
    } else {
      console.warn(`[DEV MODE] Falling back to MOCK gateway because ${selectedGatewayRecord.name} is ${selectedGatewayRecord.locked ? 'locked' : 'disabled'}.`);
      selectedGatewayRecord = allGateways.find(g => g.code === 'mock');
      if (!selectedGatewayRecord) {
        throw new Error('Mock payment gateway not found, and other gateways are unavailable.');
      }
    }
  }

  selectedGatewayInstance = getGatewayByCode(selectedGatewayRecord.code);

  if (!selectedGatewayInstance) {
    throw new Error(`Gateway instance for ${selectedGatewayRecord.code} not found.`);
  }

  return {
    record: selectedGatewayRecord,
    instance: selectedGatewayInstance,
  };
}

module.exports = {
  selectGateway,
};

