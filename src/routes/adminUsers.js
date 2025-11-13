const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const adminAccountController = require('../controllers/adminAccount.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Admin route to create users
router.post('/users', authenticate, authorize(PERMISSIONS.USERS_CREATE, PERMISSIONS.ACCOUNTS_CREATE), userController.create);

// Admin account management routes
router.get('/accounts', authenticate, authorize(PERMISSIONS.USERS_VIEW), adminAccountController.listAccounts);
router.get('/accounts/stats', authenticate, authorize(PERMISSIONS.USERS_VIEW), adminAccountController.stats);
router.get('/accounts/export', authenticate, authorize(PERMISSIONS.USERS_VIEW), adminAccountController.exportAccountsCSV);
router.get('/accounts/:id', authenticate, authorize(PERMISSIONS.USERS_VIEW), adminAccountController.getAccountById);
router.post('/accounts/bulk', authenticate, authorize(PERMISSIONS.USERS_MANAGE), adminAccountController.bulkAction);

module.exports = router;

