const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Admin route to create users
router.post('/users', authenticate, authorize(PERMISSIONS.USERS_CREATE, PERMISSIONS.ACCOUNTS_CREATE), userController.create);

module.exports = router;

