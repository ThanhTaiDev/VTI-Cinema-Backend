const MockPayService = require('./MockPayService');
const MoMoService = require('./MoMoService');
const VNPayService = require('./VNPayService');
const NapasQRService = require('./NapasQRService');
const ShopeePayService = require('./ShopeePayService');
const ZaloPayService = require('./ZaloPayService');
const SmartPayService = require('./SmartPayService');
const PayooService = require('./PayooService');
const CreditCardService = require('./CreditCardService');

/**
 * Gateway Factory
 * Returns gateway instance by code
 */
function getGatewayByCode(code) {
  if (!code) return null;
  
  const normalizedCode = code.toLowerCase();
  const map = {
    mock: new MockPayService(),
    momo: new MoMoService(),
    vnpay: new VNPayService(),
    napasqr: new NapasQRService(),
    shopeepay: new ShopeePayService(),
    zalopay: new ZaloPayService(),
    smartpay: new SmartPayService(),
    payoo: new PayooService(),
    card: new CreditCardService(),
    credit_card: new CreditCardService(),
  };
  
  return map[normalizedCode] || null;
}

/**
 * Get all available gateways
 */
function getAllGateways() {
  return [
    new MockPayService(),
    new MoMoService(),
    new VNPayService(),
    new NapasQRService(),
    new ShopeePayService(),
    new ZaloPayService(),
    new SmartPayService(),
    new PayooService(),
    new CreditCardService(),
  ];
}

module.exports = {
  getGatewayByCode,
  getAllGateways,
};

