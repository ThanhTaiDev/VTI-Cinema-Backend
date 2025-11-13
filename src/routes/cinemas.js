const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinemaController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Public routes
router.get('/', cinemaController.getAll);
router.get('/:id', cinemaController.getById);

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.CINEMAS_CREATE), cinemaController.create);
router.put('/:id', authenticate, authorize(PERMISSIONS.CINEMAS_UPDATE), cinemaController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.CINEMAS_DELETE), cinemaController.delete);

module.exports = router;

