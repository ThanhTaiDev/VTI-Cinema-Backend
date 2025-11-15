// Vercel Cron Job: Cleanup expired PENDING payments
// Schedule: Every 1 minute
const { cleanupExpiredPayments } = require('../../src/jobs/cleanupExpiredPayments');

module.exports = async (req, res) => {
  try {
    await cleanupExpiredPayments();
    
    res.json({ 
      success: true, 
      message: 'Expired payments cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup payments error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

