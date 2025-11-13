const prisma = require('../src/prismaClient');

/**
 * Seed RBAC: Roles and Permissions
 * Run: node scripts/seedRBAC.js
 */
async function seedRBAC() {
  console.log('🌱 Seeding RBAC data...');

  try {
    // 1. Create Permissions
    console.log('📝 Creating permissions...');
    const permissions = [
      // Movies
      { code: 'movies:view', resource: 'movies', action: 'view', description: 'Xem danh sách phim' },
      { code: 'movies:create', resource: 'movies', action: 'create', description: 'Thêm phim mới' },
      { code: 'movies:update', resource: 'movies', action: 'update', description: 'Cập nhật phim' },
      { code: 'movies:delete', resource: 'movies', action: 'delete', description: 'Xóa phim' },
      
      // Cinemas
      { code: 'cinemas:view', resource: 'cinemas', action: 'view', description: 'Xem danh sách rạp' },
      { code: 'cinemas:create', resource: 'cinemas', action: 'create', description: 'Thêm rạp mới' },
      { code: 'cinemas:update', resource: 'cinemas', action: 'update', description: 'Cập nhật rạp' },
      { code: 'cinemas:delete', resource: 'cinemas', action: 'delete', description: 'Xóa rạp' },
      
      // Screenings
      { code: 'screenings:view', resource: 'screenings', action: 'view', description: 'Xem danh sách suất chiếu' },
      { code: 'screenings:manage', resource: 'screenings', action: 'manage', description: 'Quản lý suất chiếu (thêm, sửa, xóa)' },
      
      // Tickets
      { code: 'tickets:view', resource: 'tickets', action: 'view', description: 'Xem danh sách vé' },
      { code: 'tickets:manage', resource: 'tickets', action: 'manage', description: 'Quản lý vé (khóa, hủy, hoàn tiền)' },
      { code: 'tickets:export', resource: 'tickets', action: 'export', description: 'Xuất danh sách vé' },
      
      // Orders
      { code: 'orders:view', resource: 'orders', action: 'view', description: 'Xem danh sách đơn hàng' },
      { code: 'orders:refund', resource: 'orders', action: 'refund', description: 'Hoàn tiền đơn hàng' },
      
      // Payments
      { code: 'payments:view', resource: 'payments', action: 'view', description: 'Xem danh sách thanh toán' },
      { code: 'payments:refund', resource: 'payments', action: 'refund', description: 'Hoàn tiền thanh toán' },
      { code: 'payments:gateway-config', resource: 'payments', action: 'gateway-config', description: 'Cấu hình cổng thanh toán' },
      { code: 'payments:export', resource: 'payments', action: 'export', description: 'Xuất báo cáo thanh toán' },
      
      // Users
      { code: 'users:view', resource: 'users', action: 'view', description: 'Xem danh sách người dùng' },
      { code: 'users:manage', resource: 'users', action: 'manage', description: 'Quản lý người dùng (thêm, sửa, xóa)' },
      
      // Reports
      { code: 'reports:view', resource: 'reports', action: 'view', description: 'Xem báo cáo doanh thu' },
      { code: 'reports:export', resource: 'reports', action: 'export', description: 'Xuất báo cáo' },
      
      // Events
      { code: 'events:manage', resource: 'events', action: 'manage', description: 'Quản lý sự kiện/khuyến mãi' },
      
      // Banners
      { code: 'banners:manage', resource: 'banners', action: 'manage', description: 'Quản lý banner' },
      
      // Admin
      { code: 'admin:roles', resource: 'admin', action: 'roles', description: 'Quản lý nhóm quyền' },
      { code: 'admin:permissions', resource: 'admin', action: 'permissions', description: 'Quản lý phân quyền' },
    ];

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // 2. Create Roles
    console.log('👥 Creating roles...');
    const roles = [
      {
        code: 'ADMIN',
        name: 'Quản trị viên',
        description: 'Full quyền - Quản trị toàn bộ hệ thống',
      },
      {
        code: 'MANAGER',
        name: 'Quản lý',
        description: 'Quản lý phim, rạp, suất chiếu, vé, thanh toán',
      },
      {
        code: 'CONTENT_MANAGER',
        name: 'Quản lý nội dung',
        description: 'Quản lý nội dung trên web (phim, sự kiện, banner)',
      },
      {
        code: 'SUPPORT',
        name: 'Hỗ trợ',
        description: 'Xem và quản lý vé, đơn hàng, thanh toán',
      },
      {
        code: 'USER',
        name: 'Người dùng',
        description: 'Người dùng thông thường - chỉ xem và đặt vé',
      },
    ];

    const createdRoles = [];
    for (const role of roles) {
      const created = await prisma.role.upsert({
        where: { code: role.code },
        update: {},
        create: role,
      });
      createdRoles.push(created);
    }
    console.log(`✅ Created ${createdRoles.length} roles`);

    // 3. Assign Permissions to Roles
    console.log('🔗 Assigning permissions to roles...');

    // ADMIN - All permissions
    const adminRole = createdRoles.find(r => r.code === 'ADMIN');
    if (adminRole) {
      const allPermissions = await prisma.permission.findMany();
      for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }
      console.log(`✅ Assigned all ${allPermissions.length} permissions to ADMIN`);
    }

    // MANAGER - Movies, Cinemas, Screenings, Tickets, Orders, Payments, Reports
    const managerRole = createdRoles.find(r => r.code === 'MANAGER');
    if (managerRole) {
      const managerPerms = await prisma.permission.findMany({
        where: {
          OR: [
            { resource: 'movies' },
            { resource: 'cinemas' },
            { resource: 'screenings' },
            { resource: 'tickets' },
            { resource: 'orders' },
            { resource: 'payments' },
            { resource: 'reports' },
          ],
        },
      });
      for (const perm of managerPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: managerRole.id,
            permissionId: perm.id,
          },
        });
      }
      console.log(`✅ Assigned ${managerPerms.length} permissions to MANAGER`);
    }

    // CONTENT_MANAGER - Movies (view, create, update), Events, Banners
    const contentManagerRole = createdRoles.find(r => r.code === 'CONTENT_MANAGER');
    if (contentManagerRole) {
      const contentPerms = await prisma.permission.findMany({
        where: {
          OR: [
            { code: 'movies:view' },
            { code: 'movies:create' },
            { code: 'movies:update' },
            { resource: 'events' },
            { resource: 'banners' },
          ],
        },
      });
      for (const perm of contentPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: contentManagerRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: contentManagerRole.id,
            permissionId: perm.id,
          },
        });
      }
      console.log(`✅ Assigned ${contentPerms.length} permissions to CONTENT_MANAGER`);
    }

    // SUPPORT - View tickets, orders, payments (no refund)
    const supportRole = createdRoles.find(r => r.code === 'SUPPORT');
    if (supportRole) {
      const supportPerms = await prisma.permission.findMany({
        where: {
          OR: [
            { code: 'tickets:view' },
            { code: 'orders:view' },
            { code: 'payments:view' },
            { code: 'users:view' },
          ],
        },
      });
      for (const perm of supportPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: supportRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: supportRole.id,
            permissionId: perm.id,
          },
        });
      }
      console.log(`✅ Assigned ${supportPerms.length} permissions to SUPPORT`);
    }

    // USER - No admin permissions (only public access)
    console.log('✅ USER role has no admin permissions (public access only)');

    // 4. Assign ADMIN role to existing ADMIN users
    console.log('👤 Assigning ADMIN role to existing ADMIN users...');
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (adminRole && adminUsers.length > 0) {
      for (const user of adminUsers) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: adminRole.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: adminRole.id,
          },
        });
      }
      console.log(`✅ Assigned ADMIN role to ${adminUsers.length} existing admin users`);
    }

    console.log('✅ RBAC seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRBAC()
    .then(() => {
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed:', error);
      process.exit(1);
    });
}

module.exports = { seedRBAC };

