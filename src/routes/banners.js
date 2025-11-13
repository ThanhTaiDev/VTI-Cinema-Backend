const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/bannerController')
const { authenticate } = require('../middlewares/auth')
const { authorize } = require('../middlewares/authorize')
const PERMISSIONS = require('../config/permissions')

// Public routes
router.get('/', bannerController.getAll)
router.get('/:id', bannerController.getById)

// Admin routes
router.post('/', authenticate, authorize(PERMISSIONS.BANNERS_CREATE), bannerController.create)
router.put('/:id', authenticate, authorize(PERMISSIONS.BANNERS_UPDATE), bannerController.update)
router.delete('/:id', authenticate, authorize(PERMISSIONS.BANNERS_DELETE), bannerController.delete)
router.post('/order', authenticate, authorize(PERMISSIONS.BANNERS_UPDATE), bannerController.updateOrder)

module.exports = router

