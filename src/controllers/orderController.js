const orderService = require('../services/orderService');

exports.create = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body, req.user.id);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const orders = await orderService.getUserOrders(req.user.id, status);
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOrderByQrCode = async (req, res, next) => {
  try {
    const { qrCode } = req.params;
    const order = await orderService.getOrderByQrCode(qrCode);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

