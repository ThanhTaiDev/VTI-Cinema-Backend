const paymentGatewayService = require('./paymentGateway.service');

async function listGateways(req, res, next) {
  try {
    const filters = {
      enabled: req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined,
      code: req.query.code,
      q: req.query.q,
    };

    const gateways = await paymentGatewayService.listGateways(filters);
    res.json({ gateways });
  } catch (error) {
    next(error);
  }
}

async function createGateway(req, res, next) {
  try {
    const gateway = await paymentGatewayService.createGateway(req.body);
    res.status(201).json(gateway);
  } catch (error) {
    next(error);
  }
}

async function updateGateway(req, res, next) {
  try {
    const gateway = await paymentGatewayService.updateGateway(req.params.id, req.body);
    res.json(gateway);
  } catch (error) {
    next(error);
  }
}

async function deleteGateway(req, res, next) {
  try {
    await paymentGatewayService.deleteGateway(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function toggleGateway(req, res, next) {
  try {
    const gateway = await paymentGatewayService.toggleGateway(req.params.id);
    res.json(gateway);
  } catch (error) {
    next(error);
  }
}

async function lockGateway(req, res, next) {
  try {
    const gateway = await paymentGatewayService.lockGateway(req.params.id, req.body?.reason);
    res.json(gateway);
  } catch (error) {
    next(error);
  }
}

async function unlockGateway(req, res, next) {
  try {
    const gateway = await paymentGatewayService.unlockGateway(req.params.id);
    res.json(gateway);
  } catch (error) {
    next(error);
  }
}

async function previewFee(req, res, next) {
  try {
    const { gatewayCode, amount, method } = req.body;
    const result = await paymentGatewayService.previewFee({ gatewayCode, amount, method });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getAvailableGateways(req, res, next) {
  try {
    const gateways = await paymentGatewayService.listAvailableGateways();
    res.json({ gateways });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listGateways,
  getAvailableGateways,
  createGateway,
  updateGateway,
  deleteGateway,
  toggleGateway,
  lockGateway,
  unlockGateway,
  previewFee,
};

