const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// User routes - Get and update own profile
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);

// Admin routes only
router.get('/', authenticate, authorize(PERMISSIONS.USERS_VIEW), userController.getAll);
router.get('/:id', authenticate, authorize(PERMISSIONS.USERS_VIEW), userController.getById);
router.put('/:id', authenticate, authorize(PERMISSIONS.USERS_UPDATE), userController.update);
router.delete('/:id', authenticate, authorize(PERMISSIONS.USERS_DELETE), userController.delete);

module.exports = router;

