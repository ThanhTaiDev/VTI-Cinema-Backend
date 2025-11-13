const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin activities...');

  // Get admin users
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'ADMIN' },
        {
          userRoles: {
            some: {
              role: {
                code: 'ADMIN',
              },
            },
          },
        },
      ],
    },
    take: 3,
  });

  if (adminUsers.length === 0) {
    console.log('⚠️  No admin users found. Creating activities with first user...');
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      console.log('❌ No users found. Please seed users first.');
      return;
    }
    adminUsers.push(firstUser);
  }

  const activities = [
    {
      actorId: adminUsers[0].id,
      action: 'create',
      resource: 'movie',
      resourceId: null,
      metadata: { title: 'Sample Movie' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'update',
      resource: 'screening',
      resourceId: null,
      metadata: { screeningId: 'sample-123' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'create',
      resource: 'banner',
      resourceId: null,
      metadata: { title: 'New Banner' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'view',
      resource: 'dashboard',
      resourceId: null,
      metadata: null,
    },
    {
      actorId: adminUsers[0].id,
      action: 'create',
      resource: 'promotion',
      resourceId: null,
      metadata: { title: 'Summer Promotion' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'update',
      resource: 'payment',
      resourceId: null,
      metadata: { paymentId: 'sample-payment' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'delete',
      resource: 'banner',
      resourceId: null,
      metadata: { bannerId: 'old-banner' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'view',
      resource: 'revenue',
      resourceId: null,
      metadata: { period: 'month' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'create',
      resource: 'user',
      resourceId: null,
      metadata: { email: 'newuser@example.com' },
    },
    {
      actorId: adminUsers[0].id,
      action: 'update',
      resource: 'movie',
      resourceId: null,
      metadata: { movieId: 'sample-movie', status: 'NOW_PLAYING' },
    },
  ];

  // Create activities with timestamps spread over last 7 days
  const now = new Date();
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    const createdAt = new Date(now.getTime() - (activities.length - i) * 12 * 60 * 60 * 1000);
    
    await prisma.adminActivity.create({
      data: {
        ...activity,
        createdAt,
      },
    });
  }

  console.log(`✅ Created ${activities.length} admin activities`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin activities:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

