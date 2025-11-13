const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Public routes
router.get('/', movieController.getAll);
router.get('/slug/:slug', movieController.getBySlug);
router.get('/:id', movieController.getById);

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.MOVIES_CREATE), movieController.create);
router.put('/:id', authenticate, authorize(PERMISSIONS.MOVIES_UPDATE), movieController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.MOVIES_DELETE), movieController.delete);

module.exports = router;

