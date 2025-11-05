const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinemaController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Public routes
router.get('/', cinemaController.getAll);
router.get('/:id', cinemaController.getById);

// Admin routes
router.post('/', authenticate, requireAdmin, cinemaController.create);
router.put('/:id', authenticate, requireAdmin, cinemaController.update);
router.delete('/:id', authenticate, requireAdmin, cinemaController.delete);

module.exports = router;

