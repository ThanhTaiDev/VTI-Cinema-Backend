const ticketService = require('../services/ticketService');

exports.getAll = async (req, res, next) => {
  try {
    const tickets = await ticketService.getAll(req.query);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const ticket = await ticketService.create(req.body, req.user.id);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const ticket = await ticketService.cancel(req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const ticket = await ticketService.lock(req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

