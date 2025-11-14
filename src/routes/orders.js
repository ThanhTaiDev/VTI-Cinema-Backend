const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.post('/', authenticate, orderController.create);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/qr/:qrCode', orderController.getOrderByQrCode); // Public route for QR scanning
router.get('/:id', authenticate, orderController.getById);
router.delete('/:id', authenticate, orderController.cancel); // Cancel order

module.exports = router;

