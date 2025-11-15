// Vercel Cron Job: Cleanup expired seat holds
// Schedule: Every 1 minute
module.exports = async (req, res) => {
  try {
    const { cleanupExpiredHolds } = require('../../src/jobs/cleanupExpiredHolds');
    await cleanupExpiredHolds();
    
    res.json({ 
      success: true, 
      message: 'Expired seat holds cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup holds error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

