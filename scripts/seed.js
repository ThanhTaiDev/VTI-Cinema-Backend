const bcrypt = require('bcrypt');
const prisma = require('../src/prismaClient');

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vticinema.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@vticinema.com',
      phone: '0900000000',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created:', admin.email);
  console.log('📧 Email: admin@vticinema.com');
  console.log('🔑 Password: admin123');

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'user@test.com',
      phone: '0900000001',
      password: userPassword,
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Test user created:', user.email);
  console.log('📧 Email: user@test.com');
  console.log('🔑 Password: user123');

  // Create sample cinemas
  const cinema1 = await prisma.cinema.upsert({
    where: { id: 'cinema-1' },
    update: {},
    create: {
      id: 'cinema-1',
      name: 'CGV Aeon Long Biên',
      region: 'Hà Nội',
      address: 'Aeon Mall Long Biên, Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  const cinema2 = await prisma.cinema.upsert({
    where: { id: 'cinema-2' },
    update: {},
    create: {
      id: 'cinema-2',
      name: 'CGV Aeon Bình Tân',
      region: 'Hồ Chí Minh',
      address: 'Aeon Mall Bình Tân, TP.HCM',
      latitude: 10.7769,
      longitude: 106.7009,
      logoUrl: 'https://example.com/cgv-logo.png',
      phone: '1900-6017',
    },
  });

  console.log('✅ Sample cinemas created');

  // Create sample movies
  const movie1 = await prisma.movie.upsert({
    where: { id: 'movie-1' },
    update: {},
    create: {
      id: 'movie-1',
      title: 'Robot Hoang Dã',
      actors: 'Trần Nghĩa',
      duration: 124,
      genres: 'Khoa học viễn tưởng, Phiêu lưu',
      releaseDate: new Date('2025-01-01'),
      rating: 8.5,
      description: 'Câu chuyện về một robot hoang dã trong tương lai',
      posterUrl: 'https://example.com/robot-hoang-da.jpg',
    },
  });

  const movie2 = await prisma.movie.upsert({
    where: { id: 'movie-2' },
    update: {},
    create: {
      id: 'movie-2',
      title: 'Mắt Biếc',
      actors: 'Trần Nghĩa',
      duration: 114,
      genres: 'Tâm lý',
      releaseDate: new Date('2025-01-01'),
      rating: 7.6,
      description: 'Câu chuyện tình cảm tuổi học trò',
      posterUrl: 'https://example.com/mat-biec.jpg',
    },
  });

  console.log('✅ Sample movies created');

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
