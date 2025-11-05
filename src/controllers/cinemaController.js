const cinemaService = require('../services/cinemaService');

exports.getAll = async (req, res, next) => {
  try {
    const cinemas = await cinemaService.getAll(req.query);
    res.json(cinemas);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const cinema = await cinemaService.getById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: 'Cinema not found' });
    }
    res.json(cinema);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const cinema = await cinemaService.create(req.body);
    res.status(201).json(cinema);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const cinema = await cinemaService.update(req.params.id, req.body);
    res.json(cinema);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await cinemaService.delete(req.params.id);
    res.json({ message: 'Cinema deleted successfully' });
  } catch (err) {
    next(err);
  }
};

