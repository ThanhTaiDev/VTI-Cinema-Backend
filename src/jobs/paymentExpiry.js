// DEMO ONLY - DO NOT USE IN PRODUCTION
// Background job to expire pending payments after 10 minutes

const prisma = require('../prismaClient');
const cron = require('node-cron');

/**
 * Expire pending payments that have passed their expiry time
 */
async function expirePayments() {
  try {
    const now = new Date();
    
    // Find all pending payments that have expired
    const expiredPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lte: now,
        },
      },
      include: {
        order: true,
      },
    });

    if (expiredPayments.length === 0) {
      return { expired: 0 };
    }

    // Update expired payments
    const updateResult = await prisma.payment.updateMany({
      where: {
        id: {
          in: expiredPayments.map(p => p.id),
        },
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
        errorCode: 'PAYMENT_EXPIRED',
        errorMessage: 'Payment expired after 10 minutes',
      },
    });

    // Release seats for expired payments (update order status to CANCELLED and release holds)
    const orderService = require('../services/orderService');
    for (const payment of expiredPayments) {
      if (payment.order && payment.order.status === 'PENDING') {
        try {
          await orderService.cancelOrder(payment.orderId);
        } catch (err) {
          console.error(`[Payment Expiry] Error cancelling order ${payment.orderId}:`, err);
        }
      }
    }

    console.log(`[Payment Expiry] Expired ${updateResult.count} payments`);
    return { expired: updateResult.count };
  } catch (error) {
    console.error('[Payment Expiry] Error:', error);
    throw error;
  }
}

/**
 * Start the payment expiry cron job
 * Runs every minute to check for expired payments
 */
function startPaymentExpiryJob() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await expirePayments();
    } catch (error) {
      console.error('[Payment Expiry Job] Error:', error);
    }
  });

  console.log('[Payment Expiry Job] Started - checking every minute');
}

module.exports = {
  expirePayments,
  startPaymentExpiryJob,
};

