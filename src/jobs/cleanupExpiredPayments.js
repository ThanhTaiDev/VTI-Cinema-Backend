const prisma = require('../prismaClient');

/**
 * Cleanup expired PENDING payments
 * Mark payments as FAILED if order has expired
 */
async function cleanupExpiredPayments() {
  try {
    const now = new Date();
    
    // Find all PENDING payments with expired orders
    const expiredPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        order: {
          expiresAt: {
            lt: now,
          },
          status: 'PENDING',
        },
      },
      include: {
        order: true,
      },
    });

    if (expiredPayments.length > 0) {
      console.log(`[CleanupExpiredPayments] Found ${expiredPayments.length} expired payments`);
      
      // Update payments to FAILED
      await prisma.payment.updateMany({
        where: {
          id: {
            in: expiredPayments.map(p => p.id),
          },
        },
        data: {
          status: 'FAILED',
          errorCode: 'ORDER_EXPIRED',
          errorMessage: 'Payment failed because order has expired',
        },
      });

      // Update orders to EXPIRED and release holds
      const orderService = require('../services/orderService');
      const orderIds = expiredPayments.map(p => p.orderId);
      
      // Cancel each order individually to release holds
      for (const orderId of orderIds) {
        try {
          await orderService.updateOrderStatus(orderId, 'EXPIRED');
        } catch (err) {
          console.error(`[CleanupExpiredPayments] Error expiring order ${orderId}:`, err);
        }
      }

      console.log(`[CleanupExpiredPayments] Updated ${expiredPayments.length} payments to FAILED`);
    }
  } catch (error) {
    console.error('[CleanupExpiredPayments] Error:', error);
  }
}

/**
 * Start cleanup job
 * @param {number} intervalMs - Interval in milliseconds (default: 30000 = 30 seconds)
 */
function startCleanupJob(intervalMs = 30000) {
  console.log(`[CleanupExpiredPayments] Starting cleanup job (interval: ${intervalMs}ms)`);
  
  // Run immediately
  cleanupExpiredPayments();
  
  // Then run at interval
  setInterval(cleanupExpiredPayments, intervalMs);
}

module.exports = {
  cleanupExpiredPayments,
  startCleanupJob,
};

