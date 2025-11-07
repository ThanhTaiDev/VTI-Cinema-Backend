const MockPayService = require('./MockPayService');
const MoMoService = require('./MoMoService');
const VNPayService = require('./VNPayService');

/**
 * Gateway Factory
 * Returns gateway instance by code
 */
function getGatewayByCode(code) {
  const map = {
    mock: new MockPayService(),
    momo: new MoMoService(),
    vnpay: new VNPayService(),
  };
  
  return map[code] || null;
}

/**
 * Get all available gateways
 */
function getAllGateways() {
  return [
    new MockPayService(),
    new MoMoService(),
    new VNPayService(),
  ];
}

module.exports = {
  getGatewayByCode,
  getAllGateways,
};

