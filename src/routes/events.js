const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Public routes
router.get('/', eventController.getAll);
router.get('/slug/:slug', eventController.getBySlug);
router.get('/:id', eventController.getById);

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.EVENTS_CREATE), eventController.create);
router.put('/:id', authenticate, authorize(PERMISSIONS.EVENTS_UPDATE), eventController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.EVENTS_DELETE), eventController.delete);

module.exports = router;

