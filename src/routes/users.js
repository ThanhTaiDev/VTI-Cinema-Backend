const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Admin routes only
router.get('/', authenticate, requireAdmin, userController.getAll);
router.get('/:id', authenticate, requireAdmin, userController.getById);
router.put('/:id', authenticate, requireAdmin, userController.update);
router.delete('/:id', authenticate, requireAdmin, userController.delete);

module.exports = router;

