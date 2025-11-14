const prisma = require('../prismaClient')

// Reward milestones configuration (in VND)
const REWARD_MILESTONES = [
  { amount: 500000, title: 'Voucher 50.000đ', description: 'Giảm giá 50.000đ cho đơn hàng tiếp theo', value: 50000, type: 'VOUCHER' },
  { amount: 1000000, title: 'Voucher 100.000đ', description: 'Giảm giá 100.000đ cho đơn hàng tiếp theo', value: 100000, type: 'VOUCHER' },
  { amount: 2000000, title: 'Voucher 150.000đ', description: 'Giảm giá 150.000đ cho đơn hàng tiếp theo', value: 150000, type: 'VOUCHER' },
  { amount: 5000000, title: 'Voucher 300.000đ', description: 'Giảm giá 300.000đ cho đơn hàng tiếp theo', value: 300000, type: 'VOUCHER' },
  { amount: 10000000, title: 'Voucher 500.000đ', description: 'Giảm giá 500.000đ cho đơn hàng tiếp theo', value: 500000, type: 'VOUCHER' },
]

/**
 * Generate a unique voucher code
 */
function generateVoucherCode() {
  const prefix = 'VTI'
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase().substring(-4)
  return `${prefix}-${random}-${timestamp}`
}

/**
 * Check if user has reached a new reward milestone and create reward + notification
 */
async function checkAndCreateRewards(userId, newTotalSpending) {
  try {
    // Get user's current rewards to see which milestones they've already reached
    const existingRewards = await prisma.reward.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'USED'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Find milestones that user has reached but hasn't received reward yet
    const reachedMilestones = REWARD_MILESTONES.filter(milestone => {
      // Check if user has reached this milestone
      const hasReached = newTotalSpending >= milestone.amount
      
      // Check if user already has a reward for this milestone
      const hasReward = existingRewards.some(reward => {
        const rewardMilestone = reward.metadata?.milestoneAmount
        return rewardMilestone === milestone.amount
      })
      
      return hasReached && !hasReward
    })

    // Create rewards and notifications for newly reached milestones
    const createdRewards = []
    for (const milestone of reachedMilestones) {
      // Generate voucher code
      const voucherCode = generateVoucherCode()
      
      // Set expiration date (30 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Create reward
      const reward = await prisma.reward.create({
        data: {
          userId,
          type: milestone.type,
          title: milestone.title,
          description: milestone.description,
          value: milestone.value,
          code: voucherCode,
          status: 'ACTIVE',
          expiresAt,
          metadata: {
            milestoneAmount: milestone.amount,
            milestoneReachedAt: new Date().toISOString(),
          },
        },
      })

      createdRewards.push(reward)

      // Create notification
      const milestoneAmountFormatted = formatCurrency(milestone.amount)
      await prisma.notification.create({
        data: {
          userId,
          type: 'REWARD_MILESTONE',
          title: `Chúc mừng! Bạn đã đạt mốc ${milestoneAmountFormatted}`,
          message: `Bạn đã đạt mốc chi tiêu ${milestoneAmountFormatted} và nhận được ${milestone.title}. Mã voucher: ${voucherCode}`,
          metadata: {
            rewardId: reward.id,
            milestoneAmount: milestone.amount,
            voucherCode,
          },
        },
      })

      console.log(`[RewardService] Created reward for milestone ${milestone.amount} for user ${userId}`)
    }

    return createdRewards
  } catch (error) {
    console.error('[RewardService] Error checking and creating rewards:', error)
    throw error
  }
}

/**
 * Update user's total spending for 2025 and check for rewards
 */
async function updateUserSpending(userId, paymentAmount) {
  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalSpending2025: true },
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    // Calculate new total spending (only count payments in 2025)
    const currentYear = new Date().getFullYear()
    if (currentYear !== 2025) {
      // If not 2025, don't update spending
      console.log(`[RewardService] Not 2025, skipping spending update`)
      return { newTotalSpending: user.totalSpending2025, rewards: [] }
    }

    const newTotalSpending = user.totalSpending2025 + paymentAmount

    // Update user's total spending
    await prisma.user.update({
      where: { id: userId },
      data: { totalSpending2025: newTotalSpending },
    })

    console.log(`[RewardService] Updated user ${userId} spending: ${user.totalSpending2025} -> ${newTotalSpending}`)

    // Check for new reward milestones
    const rewards = await checkAndCreateRewards(userId, newTotalSpending)

    return {
      newTotalSpending,
      rewards,
    }
  } catch (error) {
    console.error('[RewardService] Error updating user spending:', error)
    throw error
  }
}

/**
 * Format currency helper
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

/**
 * Get user's rewards
 */
async function getUserRewards(userId, options = {}) {
  const { status, includeExpired = false } = options

  const where = {
    userId,
  }

  if (status) {
    where.status = status
  } else if (!includeExpired) {
    // Only get active rewards that haven't expired
    where.status = 'ACTIVE'
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]
  }
  // If includeExpired is true, get all rewards (ACTIVE, USED, EXPIRED)

  return await prisma.reward.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get user's notifications
 */
async function getUserNotifications(userId, options = {}) {
  const { isRead, limit = 50 } = options

  const where = { userId }
  if (isRead !== undefined) {
    where.isRead = isRead
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  return await prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: { isRead: true },
  })
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  })
}

/**
 * Get reward milestones configuration
 */
function getMilestones() {
  return REWARD_MILESTONES
}

/**
 * Validate and get voucher by code
 */
async function validateVoucher(voucherCode, userId) {
  try {
    if (!voucherCode || !voucherCode.trim()) {
      throw new Error('Mã voucher không được để trống')
    }

    const code = voucherCode.trim().toUpperCase()
    
    // Find voucher by code
    const reward = await prisma.reward.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!reward) {
      throw new Error('Mã voucher không hợp lệ')
    }

    // Check if voucher belongs to user
    if (reward.userId !== userId) {
      throw new Error('Mã voucher không thuộc về tài khoản của bạn')
    }

    // Check if voucher is active
    if (reward.status !== 'ACTIVE') {
      if (reward.status === 'USED') {
        throw new Error('Mã voucher đã được sử dụng')
      }
      if (reward.status === 'EXPIRED') {
        throw new Error('Mã voucher đã hết hạn')
      }
      throw new Error('Mã voucher không khả dụng')
    }

    // Check if voucher has expired
    if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
      // Update status to EXPIRED
      await prisma.reward.update({
        where: { id: reward.id },
        data: { status: 'EXPIRED' },
      })
      throw new Error('Mã voucher đã hết hạn')
    }

    // Check if voucher has value
    if (!reward.value || reward.value <= 0) {
      throw new Error('Mã voucher không có giá trị giảm giá')
    }

    return {
      id: reward.id,
      code: reward.code,
      value: reward.value,
      title: reward.title,
      description: reward.description,
      type: reward.type,
      expiresAt: reward.expiresAt,
    }
  } catch (error) {
    console.error('[RewardService] Error validating voucher:', error)
    throw error
  }
}

/**
 * Mark voucher as used
 */
async function markVoucherAsUsed(rewardId, orderId) {
  try {
    return await prisma.reward.update({
      where: { id: rewardId },
      data: {
        status: 'USED',
        usedAt: new Date(),
        usedOrderId: orderId,
      },
    })
  } catch (error) {
    console.error('[RewardService] Error marking voucher as used:', error)
    throw error
  }
}

module.exports = {
  updateUserSpending,
  checkAndCreateRewards,
  getUserRewards,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getMilestones,
  validateVoucher,
  markVoucherAsUsed,
  REWARD_MILESTONES,
}

