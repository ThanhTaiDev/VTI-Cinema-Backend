const prisma = require('../prismaClient');

let cleanupWarned = false; // Flag to only log model warning once

/**
 * Cleanup job to mark expired PENDING tickets as FAILED
 * Run this every 30 seconds
 */
async function cleanupExpiredTickets() {
  try {
    if (!prisma || !prisma.ticket) {
      if (!cleanupWarned) {
        console.warn('[Cleanup Tickets] Ticket model not initialized yet. Please run: npx prisma migrate dev && npx prisma generate');
        cleanupWarned = true;
      }
      return { updated: 0 };
    }

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

    // Find PENDING tickets created more than 10 minutes ago
    // First get all PENDING tickets older than 10 minutes
    const allExpiredTickets = await prisma.ticket.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lte: tenMinutesAgo,
        },
      },
      include: {
        order: true,
      },
    });

    // Filter to only tickets with PENDING orders
    const expiredTickets = allExpiredTickets.filter(t => t.order && t.order.status === 'PENDING');

    if (expiredTickets.length === 0) {
      return { updated: 0 };
    }

    // Update tickets to FAILED status
    const updatedTickets = await prisma.ticket.updateMany({
      where: {
        id: {
          in: expiredTickets.map(t => t.id),
        },
      },
      data: {
        status: 'FAILED',
      },
    });

    // Also update related orders to EXPIRED if all tickets are failed
    const orderIds = [...new Set(expiredTickets.map(t => t.orderId))];
    for (const orderId of orderIds) {
      const orderTickets = await prisma.ticket.findMany({
        where: { orderId },
      });
      
      // If all tickets are FAILED or CANCELED, mark order as EXPIRED
      const allFailed = orderTickets.every(t => t.status === 'FAILED' || t.status === 'CANCELED');
      if (allFailed && orderTickets.length > 0) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'EXPIRED' },
        });
      }
    }

    if (updatedTickets.count > 0) {
      console.log(`[Cleanup Tickets] Marked ${updatedTickets.count} expired PENDING tickets as FAILED`);
    }

    return { updated: updatedTickets.count };
  } catch (error) {
    // Don't throw error, just log it to avoid crashing the job
    const errorMsg = error.message || error.toString();
    
    // Only log model initialization warning once
    if (errorMsg.includes('Ticket') || errorMsg.includes('not initialized')) {
      if (!cleanupWarned) {
        console.warn('[Cleanup Tickets] Ticket model not initialized yet. Please run: npx prisma migrate dev && npx prisma generate');
        cleanupWarned = true;
      }
    } else {
      // Log other errors normally
      console.error('[Cleanup Tickets] Error updating expired tickets:', errorMsg);
    }
    return { updated: 0, error: errorMsg };
  }
}

/**
 * Start cleanup job
 */
function startCleanupJob(intervalMs = 30000) {
  console.log(`[Cleanup Tickets] Starting cleanup job (interval: ${intervalMs}ms)`);
  
  // Wait a bit before first run to ensure Prisma is initialized
  setTimeout(() => {
    cleanupExpiredTickets();
  }, 2000);
  
  // Then run at interval
  const interval = setInterval(() => {
    cleanupExpiredTickets();
  }, intervalMs);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Cleanup Tickets] Stopping cleanup job');
    clearInterval(interval);
  });

  return interval;
}

module.exports = {
  cleanupExpiredTickets,
  startCleanupJob,
};

