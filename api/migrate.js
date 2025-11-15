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
    
    // Note: Prisma Client should already be generated during build (postinstall script)
    // Skip prisma generate in runtime as Vercel has read-only filesystem
    
    // Chạy migrations
    console.log('Running migrations...');
    const output = execSync('npx prisma migrate deploy', { 
      encoding: 'utf8',
      env: {
        ...process.env,
        // Set working directory to project root
        PRISMA_SCHEMA_PATH: './prisma/schema.prisma'
      },
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
    const errorOutput = error.stdout || error.stderr || error.message || error.toString();
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString(),
      output: errorOutput,
      hint: 'Check Vercel Runtime Logs for more details'
    });
  }
};

