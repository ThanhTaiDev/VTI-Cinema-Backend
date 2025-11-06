const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', movieController.getAll);
router.get('/slug/:slug', movieController.getBySlug);
router.get('/:id', movieController.getById);

// Admin routes
router.post('/', authenticate, requireAdmin, movieController.create);
router.put('/:id', authenticate, requireAdmin, movieController.update);
router.delete('/:id', authenticate, requireAdmin, movieController.delete);

module.exports = router;

