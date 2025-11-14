const express = require('express')
const router = express.Router()
const rewardController = require('../controllers/rewardController')
const { authenticate } = require('../middlewares/auth')

// All routes require authentication
router.use(authenticate)

// Get user's rewards
router.get('/rewards', rewardController.getUserRewards)

// Get user's notifications
router.get('/notifications', rewardController.getUserNotifications)

// Mark notification as read
router.patch('/notifications/:notificationId/read', rewardController.markNotificationAsRead)

// Mark all notifications as read
router.patch('/notifications/read-all', rewardController.markAllNotificationsAsRead)

// Get reward milestones (public info)
router.get('/milestones', rewardController.getRewardMilestones)

// Validate voucher code
router.post('/vouchers/validate', rewardController.validateVoucher)

module.exports = router

