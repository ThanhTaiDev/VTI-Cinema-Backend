const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middlewares/auth');

// Public routes
router.get('/movie/:movieId', reviewController.getByMovieId);

// User routes
router.post('/', authenticate, reviewController.create);
router.put('/:id', authenticate, reviewController.update);
router.delete('/:id', authenticate, reviewController.delete);

module.exports = router;

