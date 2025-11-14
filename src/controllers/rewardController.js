const rewardService = require('../services/rewardService')

/**
 * Get user's rewards
 */
exports.getUserRewards = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status, includeExpired } = req.query

    const rewards = await rewardService.getUserRewards(userId, {
      status,
      includeExpired: includeExpired === 'true',
    })

    res.json(rewards)
  } catch (error) {
    next(error)
  }
}

/**
 * Get user's notifications
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { isRead, limit } = req.query

    const notifications = await rewardService.getUserNotifications(userId, {
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      limit: limit ? parseInt(limit) : 50,
    })

    res.json(notifications)
  } catch (error) {
    next(error)
  }
}

/**
 * Mark notification as read
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { notificationId } = req.params

    const notification = await rewardService.markNotificationAsRead(notificationId, userId)

    res.json(notification)
  } catch (error) {
    next(error)
  }
}

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id

    const result = await rewardService.markAllNotificationsAsRead(userId)

    res.json({ count: result.count })
  } catch (error) {
    next(error)
  }
}

/**
 * Get reward milestones configuration
 */
exports.getRewardMilestones = async (req, res, next) => {
  try {
    const milestones = await rewardService.getMilestones()
    res.json(milestones)
  } catch (error) {
    next(error)
  }
}

