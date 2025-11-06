const ticketService = require('../services/ticketService');

exports.getAll = async (req, res, next) => {
  try {
    const result = await ticketService.getAll(req.query);
    res.json(result);
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

exports.unlock = async (req, res, next) => {
  try {
    const ticket = await ticketService.unlock(req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.refund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ticket = await ticketService.refund(req.params.id, reason);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
};

exports.exportToCSV = async (req, res, next) => {
  try {
    const csvContent = await ticketService.exportToCSV(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tickets-${Date.now()}.csv`);
    res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 support
  } catch (err) {
    next(err);
  }
};

exports.bulkLock = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const results = await ticketService.bulkLock(ids);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

exports.bulkUnlock = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const results = await ticketService.bulkUnlock(ids);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

exports.bulkCancel = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const results = await ticketService.bulkCancel(ids);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

exports.bulkRefund = async (req, res, next) => {
  try {
    const { ids, reason } = req.body;
    const results = await ticketService.bulkRefund(ids, reason);
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const result = await ticketService.getAll({ ...req.query, userId: req.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

