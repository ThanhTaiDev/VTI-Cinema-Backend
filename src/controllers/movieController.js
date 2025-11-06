const movieService = require('../services/movieService');

exports.getAll = async (req, res, next) => {
  try {
    const movies = await movieService.getAll(req.query);
    res.json(movies);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const movie = await movieService.getById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (err) {
    next(err);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const movie = await movieService.getBySlug(req.params.slug);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const movie = await movieService.create(req.body);
    res.status(201).json(movie);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const movie = await movieService.update(req.params.id, req.body);
    res.json(movie);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await movieService.delete(req.params.id);
    res.json({ message: 'Movie deleted successfully' });
  } catch (err) {
    next(err);
  }
};

