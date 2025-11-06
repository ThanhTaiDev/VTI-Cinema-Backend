const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.post('/', authenticate, orderController.create);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getById);

module.exports = router;

