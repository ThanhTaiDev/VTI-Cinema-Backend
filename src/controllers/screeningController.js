const screeningService = require('../services/screeningService');

exports.getAll = async (req, res, next) => {
  try {
    const screenings = await screeningService.getAll(req.query);
    res.json(screenings);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const screening = await screeningService.getById(req.params.id);
    if (!screening) {
      return res.status(404).json({ message: 'Screening not found' });
    }
    res.json(screening);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const screening = await screeningService.create(req.body);
    res.status(201).json(screening);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const screening = await screeningService.update(req.params.id, req.body);
    res.json(screening);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await screeningService.delete(req.params.id);
    res.json({ message: 'Screening deleted successfully' });
  } catch (err) {
    next(err);
  }
};

