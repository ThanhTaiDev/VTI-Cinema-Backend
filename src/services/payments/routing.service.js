const prisma = require('../../prismaClient');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');

/**
 * Select payment gateway based on order, amount, and user
 * @param {Object} params - { order, amount, user }
 * @returns {Promise<Object>} - Gateway instance
 */
async function selectGateway({ order, amount, user }) {
  // Get enabled gateways from database
  const gateways = await prisma.paymentGateway.findMany({
    where: {
      enabled: true,
      locked: false,
    },
    orderBy: {
      code: 'asc',
    },
  });

  if (gateways.length === 0) {
    // Fallback to mock if no gateways configured
    return getGatewayByCode('mock');
  }

  // Simple routing logic:
  // - Amount < 2,000,000 VND → MoMo
  // - Amount >= 2,000,000 VND → VNPay
  // - Fallback to mock for dev
  let selectedCode = 'mock';

  if (amount < 2000000) {
    // Try MoMo first
    const momoGateway = gateways.find(g => g.code === 'momo');
    if (momoGateway) {
      selectedCode = 'momo';
    } else {
      // Fallback to first available gateway
      selectedCode = gateways[0].code;
    }
  } else {
    // Try VNPay for large amounts
    const vnpayGateway = gateways.find(g => g.code === 'vnpay');
    if (vnpayGateway) {
      selectedCode = 'vnpay';
    } else {
      // Fallback to first available gateway
      selectedCode = gateways[0].code;
    }
  }

  // Get gateway instance
  const gateway = getGatewayByCode(selectedCode);
  if (!gateway) {
    // Final fallback to mock
    return getGatewayByCode('mock');
  }

  return gateway;
}

module.exports = {
  selectGateway,
};

