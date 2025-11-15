// Vercel endpoint để seed database
// ⚠️ XÓA FILE NÀY SAU KHI SEED XONG ĐỂ BẢO MẬT!

const { execSync } = require('child_process');

module.exports = async (req, res) => {
  // Bảo mật: Chỉ cho phép với secret key
  const secret = req.query.secret || req.headers['x-secret'];
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid MIGRATION_SECRET'
    });
  }

  try {
    console.log('Seeding database...');
    
    // Seed seat types trước
    execSync('node scripts/seedSeatTypes.js', { 
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    // Seed main data
    execSync('node scripts/seed.js', { 
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    // Seed payment gateways
    execSync('node scripts/seedPaymentGateways.js', { 
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    res.json({ 
      success: true, 
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    });
  }
};

