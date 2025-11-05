const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');

// User routes
router.post('/', authenticate, paymentController.create);
router.get('/:id', authenticate, paymentController.getById);
router.post('/:id/verify', authenticate, paymentController.verify);

module.exports = router;

