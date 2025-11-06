const paymentService = require('../services/paymentService');

exports.create = async (req, res, next) => {
  try {
    const payment = await paymentService.create(req.body, req.user.id);
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const payment = await paymentService.verify(req.params.id, req.body);
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

exports.initPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { method, idempotencyKey } = req.body;
    const userId = req.user.id;
    const result = await paymentService.initPayment(orderId, userId, method, idempotencyKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['x-signature'] || req.headers['x-webhook-signature'] || '';
    const updated = await paymentService.handleWebhook(req.body, sig);
    res.json({ ok: true, payment: updated });
  } catch (err) {
    next(err);
  }
};

