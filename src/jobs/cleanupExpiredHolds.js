const seatHoldService = require('../services/seatHoldService');
const seatService = require('../services/seatService');

let cleanupWarned = false; // Flag to only log model warning once

/**
 * Cleanup job to release expired holds
 * Run this every 30 seconds
 * NEW: Uses SeatHold model for better tracking
 */
async function cleanupExpiredHolds() {
  try {
    // NEW: Cleanup expired SeatHolds
    const holdResult = await seatHoldService.cleanupExpiredHolds();
    
    // LEGACY: Also cleanup old SeatStatus holds (for backward compatibility)
    const statusResult = await seatService.releaseExpiredHolds();
    
    const totalReleased = (holdResult?.released || 0) + (statusResult?.released || 0);
    
    if (totalReleased > 0) {
      console.log(`[Cleanup] Released ${totalReleased} expired holds (${holdResult?.released || 0} from SeatHold, ${statusResult?.released || 0} from SeatStatus)`);
      // TODO: Broadcast WebSocket update to clients
    }
    
    // Reset warning flag if successful
    if ((holdResult && !holdResult.error) || (statusResult && !statusResult.error)) {
      cleanupWarned = false;
    }
    
    return {
      released: totalReleased,
      holdReleased: holdResult?.released || 0,
      statusReleased: statusResult?.released || 0,
    };
  } catch (error) {
    // Don't throw error, just log it to avoid crashing the job
    const errorMsg = error.message || error.toString();
    
    // Only log model initialization warning once
    if (errorMsg.includes('SeatHold') || errorMsg.includes('SeatStatus') || errorMsg.includes('not initialized')) {
      if (!cleanupWarned) {
        console.warn('[Cleanup] Models not initialized yet. Please run: npx prisma migrate dev && npx prisma generate');
        cleanupWarned = true;
      }
    } else {
      // Log other errors normally
      console.error('[Cleanup] Error releasing expired holds:', errorMsg);
    }
    return { released: 0, error: errorMsg };
  }
}

/**
 * Start cleanup job
 */
function startCleanupJob(intervalMs = 30000) {
  console.log(`[Cleanup] Starting cleanup job (interval: ${intervalMs}ms)`);
  
  // Wait a bit before first run to ensure Prisma is initialized
  setTimeout(() => {
    cleanupExpiredHolds();
  }, 2000);
  
  // Then run at interval
  const interval = setInterval(() => {
    cleanupExpiredHolds();
  }, intervalMs);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Cleanup] Stopping cleanup job');
    clearInterval(interval);
  });

  return interval;
}

module.exports = {
  cleanupExpiredHolds,
  startCleanupJob,
};

