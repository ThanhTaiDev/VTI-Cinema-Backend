// Vercel endpoint để chạy Prisma migrations
// ⚠️ XÓA FILE NÀY SAU KHI MIGRATE XONG ĐỂ BẢO MẬT!

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
    console.log('Running Prisma migrations...');
    
    // Chạy migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    res.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    });
  }
};

