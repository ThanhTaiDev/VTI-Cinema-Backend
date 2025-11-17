/**
 * Helper script để seed permissions trên Vercel
 * 
 * Usage:
 *   node scripts/seedPermissionsVercel.js
 * 
 * Hoặc với custom URL và secret:
 *   VERCEL_URL=https://your-app.vercel.app SEED_SECRET=your-secret node scripts/seedPermissionsVercel.js
 */

const https = require('https');
const http = require('http');

// Lấy URL và secret từ environment variables hoặc arguments
const vercelUrl = process.env.VERCEL_URL || process.argv[2] || 'https://your-app.vercel.app';
const secret = process.env.SEED_SECRET || process.env.MIGRATION_SECRET || process.argv[3];

if (!secret) {
  console.error('❌ Lỗi: Thiếu secret key!');
  console.log('\nCách sử dụng:');
  console.log('  node scripts/seedPermissionsVercel.js [VERCEL_URL] [SECRET]');
  console.log('\nHoặc set environment variables:');
  console.log('  VERCEL_URL=https://your-app.vercel.app SEED_SECRET=your-secret node scripts/seedPermissionsVercel.js');
  process.exit(1);
}

// Đảm bảo URL có protocol
const url = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
const endpoint = `${url}/api/seed-permissions?secret=${encodeURIComponent(secret)}`;

console.log('🌱 Đang seed permissions trên Vercel...');
console.log(`📍 URL: ${url}`);
console.log(`🔐 Secret: ${secret.substring(0, 4)}...`);
console.log(`\n📡 Gọi endpoint: ${endpoint.replace(secret, '***')}\n`);

const urlObj = new URL(endpoint);
const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname + urlObj.search,
  method: 'GET',
  headers: {
    'User-Agent': 'SeedPermissionsScript/1.0'
  }
};

const client = urlObj.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200 && result.success) {
        console.log('✅ Seed permissions thành công!');
        console.log(`📅 Timestamp: ${result.timestamp}`);
        console.log(`💬 Message: ${result.message}`);
      } else {
        console.error('❌ Seed permissions thất bại!');
        console.error(`📊 Status: ${res.statusCode}`);
        console.error(`💬 Error: ${result.error || result.message}`);
        if (result.details) {
          console.error(`📝 Details: ${result.details}`);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Lỗi khi parse response:', error.message);
      console.error('📄 Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Lỗi khi gọi API:', error.message);
  process.exit(1);
});

// Timeout sau 60 giây
req.setTimeout(60000, () => {
  req.destroy();
  console.error('❌ Timeout: Request mất quá nhiều thời gian (>60s)');
  process.exit(1);
});

req.end();

