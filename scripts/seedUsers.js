const bcrypt = require('bcrypt');
const prisma = require('../src/prismaClient');

/**
 * Seed admin and user accounts
 */
async function seedUsers() {
  console.log('[Seed] Starting user seed...');

  try {
    // Create admin user
    const adminEmail = 'admin@vticinema.com';
    const adminPassword = 'admin123';
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`[Seed] Admin user ${adminEmail} already exists, updating password...`);
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: adminHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed] Admin user updated: ${adminEmail} / ${adminPassword}`);
    } else {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      const admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          phone: '0123456789',
          password: adminHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed] Admin user created: ${adminEmail} / ${adminPassword}`);
    }

    // Create regular user
    const userEmail = 'user@example.com';
    const userPassword = 'user123';
    
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      console.log(`[Seed] User ${userEmail} already exists, updating password...`);
      const userHash = await bcrypt.hash(userPassword, 10);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: userHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed] User updated: ${userEmail} / ${userPassword}`);
    } else {
      const userHash = await bcrypt.hash(userPassword, 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: userEmail,
          phone: '0987654321',
          password: userHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed] User created: ${userEmail} / ${userPassword}`);
    }

    console.log('[Seed] User seed completed successfully!');
    console.log('\n=== Login Credentials ===');
    console.log('Admin:');
    console.log('  Email: admin@vticinema.com');
    console.log('  Password: admin123');
    console.log('\nUser:');
    console.log('  Email: user@example.com');
    console.log('  Password: user123');
    console.log('========================\n');
  } catch (error) {
    console.error('[Seed] Error during user seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('[Seed] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedUsers };

