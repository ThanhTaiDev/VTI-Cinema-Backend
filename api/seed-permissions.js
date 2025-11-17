// Vercel endpoint để seed permissions
// ⚠️ XÓA HOẶC VÔ HIỆU HÓA FILE NÀY SAU KHI SEED XONG ĐỂ BẢO MẬT!

const { seedPermissions } = require('../scripts/seedPermissions');

module.exports = async (req, res) => {
  // Bảo mật: Chỉ cho phép với secret key
  const secret = req.query.secret || req.headers['x-secret'];
  const expectedSecret = process.env.MIGRATION_SECRET || process.env.SEED_SECRET;
  
  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid secret key. Provide ?secret=YOUR_SECRET or x-secret header'
    });
  }

  // Chỉ cho phép POST hoặc GET với secret
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🌱 Bắt đầu seed permissions...');
    
    // Chạy seed permissions
    await seedPermissions();
    
    console.log('✅ Seed permissions hoàn thành!');
    
    res.json({ 
      success: true, 
      message: 'Permissions seeded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Seed permissions error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

