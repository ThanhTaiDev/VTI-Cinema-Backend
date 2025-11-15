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
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    
    // Generate Prisma Client first
    console.log('Generating Prisma Client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    // Chạy migrations
    console.log('Running migrations...');
    const output = execSync('npx prisma migrate deploy', { 
      encoding: 'utf8',
      env: process.env,
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    console.log('Migration output:', output);
    
    res.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      output: output,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorOutput = error.stdout || error.stderr || error.message;
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString(),
      output: errorOutput,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

