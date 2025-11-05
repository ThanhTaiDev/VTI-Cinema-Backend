const reviewService = require('../services/reviewService');

exports.getByMovieId = async (req, res, next) => {
  try {
    const reviews = await reviewService.getByMovieId(req.params.movieId);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const review = await reviewService.create(req.body, req.user.id);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const review = await reviewService.update(req.params.id, req.body, req.user.id);
    res.json(review);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await reviewService.delete(req.params.id, req.user.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    next(err);
  }
};

