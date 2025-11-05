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

