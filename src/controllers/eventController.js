const eventService = require('../services/eventService');

exports.getAll = async (req, res, next) => {
  try {
    const events = await eventService.getAll(req.query);
    res.json(events);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const event = await eventService.getById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const event = await eventService.getBySlug(req.params.slug);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const event = await eventService.create(req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const event = await eventService.update(req.params.id, req.body);
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await eventService.delete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
};

