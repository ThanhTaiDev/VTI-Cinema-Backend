const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', screeningController.getAll);
router.get('/:id', screeningController.getById);

// Admin routes
router.post('/', authenticate, requireAdmin, screeningController.create);
router.put('/:id', authenticate, requireAdmin, screeningController.update);
router.delete('/:id', authenticate, requireAdmin, screeningController.delete);

module.exports = router;

