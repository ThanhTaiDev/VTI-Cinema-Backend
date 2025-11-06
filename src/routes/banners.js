const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/bannerController')
const { authenticate, requireAdmin } = require('../middlewares/auth')

// Public routes
router.get('/', bannerController.getAll)
router.get('/:id', bannerController.getById)

// Admin routes
router.post('/', authenticate, requireAdmin, bannerController.create)
router.put('/:id', authenticate, requireAdmin, bannerController.update)
router.delete('/:id', authenticate, requireAdmin, bannerController.delete)
router.post('/order', authenticate, requireAdmin, bannerController.updateOrder)

module.exports = router

