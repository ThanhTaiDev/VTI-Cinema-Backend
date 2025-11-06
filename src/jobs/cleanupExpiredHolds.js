const seatService = require('../services/seatService');

let cleanupWarned = false; // Flag to only log model warning once

/**
 * Cleanup job to release expired holds
 * Run this every 30 seconds
 */
async function cleanupExpiredHolds() {
  try {
    const result = await seatService.releaseExpiredHolds();
    if (result && result.released > 0) {
      console.log(`[Cleanup] Released ${result.released} expired seat holds`);
      // TODO: Broadcast WebSocket update to clients
      // This would notify all clients watching this screening to update their seat map
    }
    // Reset warning flag if successful
    if (result && !result.error) {
      cleanupWarned = false;
    }
    return result || { released: 0 };
  } catch (error) {
    // Don't throw error, just log it to avoid crashing the job
    const errorMsg = error.message || error.toString();
    
    // Only log model initialization warning once
    if (errorMsg.includes('SeatStatus') || errorMsg.includes('not initialized')) {
      if (!cleanupWarned) {
        console.warn('[Cleanup] SeatStatus model not initialized yet. Please run: npx prisma migrate dev && npx prisma generate');
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

