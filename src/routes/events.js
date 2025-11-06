const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', eventController.getAll);
router.get('/slug/:slug', eventController.getBySlug);
router.get('/:id', eventController.getById);

// Admin routes
router.post('/', authenticate, requireAdmin, eventController.create);
router.put('/:id', authenticate, requireAdmin, eventController.update);
router.delete('/:id', authenticate, requireAdmin, eventController.delete);

module.exports = router;

