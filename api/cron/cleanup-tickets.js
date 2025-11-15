// Vercel Cron Job: Cleanup expired PENDING tickets
// Schedule: Every 1 minute
const { cleanupExpiredTickets } = require('../../src/jobs/cleanupExpiredTickets');

module.exports = async (req, res) => {
  try {
    await cleanupExpiredTickets();
    
    res.json({ 
      success: true, 
      message: 'Expired tickets cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup tickets error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

