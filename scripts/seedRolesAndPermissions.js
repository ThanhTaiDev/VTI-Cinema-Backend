const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PERMISSIONS = require('../src/config/permissions');

/**
 * Seed Roles and Permissions
 * Run: node backend/scripts/seedRolesAndPermissions.js
 */
async function seedRolesAndPermissions() {
  console.log('🌱 Seeding Roles and Permissions...');

  try {
    // 1. Create Permissions
    console.log('📝 Creating permissions...');
    const permissionData = [
      // Movies
      { code: PERMISSIONS.MOVIES_VIEW, resource: 'movies', action: 'view', description: 'Xem danh sách phim' },
      { code: PERMISSIONS.MOVIES_CREATE, resource: 'movies', action: 'create', description: 'Thêm phim mới' },
      { code: PERMISSIONS.MOVIES_UPDATE, resource: 'movies', action: 'update', description: 'Cập nhật phim' },
      { code: PERMISSIONS.MOVIES_DELETE, resource: 'movies', action: 'delete', description: 'Xóa phim' },
      
      // Cinemas
      { code: PERMISSIONS.CINEMAS_VIEW, resource: 'cinemas', action: 'view', description: 'Xem danh sách rạp' },
      { code: PERMISSIONS.CINEMAS_CREATE, resource: 'cinemas', action: 'create', description: 'Thêm rạp mới' },
      { code: PERMISSIONS.CINEMAS_UPDATE, resource: 'cinemas', action: 'update', description: 'Cập nhật rạp' },
      { code: PERMISSIONS.CINEMAS_DELETE, resource: 'cinemas', action: 'delete', description: 'Xóa rạp' },
      
      // Screenings
      { code: PERMISSIONS.SCREENINGS_VIEW, resource: 'screenings', action: 'view', description: 'Xem danh sách suất chiếu' },
      { code: PERMISSIONS.SCREENINGS_CREATE, resource: 'screenings', action: 'create', description: 'Thêm suất chiếu mới' },
      { code: PERMISSIONS.SCREENINGS_UPDATE, resource: 'screenings', action: 'update', description: 'Cập nhật suất chiếu' },
      { code: PERMISSIONS.SCREENINGS_DELETE, resource: 'screenings', action: 'delete', description: 'Xóa suất chiếu' },
      { code: PERMISSIONS.SCREENINGS_MANAGE, resource: 'screenings', action: 'manage', description: 'Quản lý suất chiếu (thêm, sửa, xóa)' },
      
      // Tickets
      { code: PERMISSIONS.TICKETS_VIEW, resource: 'tickets', action: 'view', description: 'Xem danh sách vé' },
      { code: PERMISSIONS.TICKETS_ISSUE, resource: 'tickets', action: 'issue', description: 'Phát hành vé' },
      { code: PERMISSIONS.TICKETS_REFUND, resource: 'tickets', action: 'refund', description: 'Hoàn tiền vé' },
      { code: PERMISSIONS.TICKETS_MANAGE, resource: 'tickets', action: 'manage', description: 'Quản lý vé (khóa, hủy, hoàn tiền)' },
      
      // Payments
      { code: PERMISSIONS.PAYMENTS_VIEW, resource: 'payments', action: 'view', description: 'Xem danh sách thanh toán' },
      { code: PERMISSIONS.PAYMENTS_REFUND, resource: 'payments', action: 'refund', description: 'Hoàn tiền thanh toán' },
      { code: PERMISSIONS.PAYMENTS_GATEWAY_CONFIG, resource: 'payments', action: 'gateway-config', description: 'Cấu hình cổng thanh toán' },
      { code: PERMISSIONS.PAYMENTS_EXPORT, resource: 'payments', action: 'export', description: 'Xuất báo cáo thanh toán' },
      
      // Users
      { code: PERMISSIONS.USERS_VIEW, resource: 'users', action: 'view', description: 'Xem danh sách người dùng' },
      { code: PERMISSIONS.USERS_CREATE, resource: 'users', action: 'create', description: 'Tạo người dùng mới' },
      { code: PERMISSIONS.USERS_UPDATE, resource: 'users', action: 'update', description: 'Cập nhật người dùng' },
      { code: PERMISSIONS.USERS_DELETE, resource: 'users', action: 'delete', description: 'Xóa người dùng' },
      { code: PERMISSIONS.USERS_MANAGE, resource: 'users', action: 'manage', description: 'Quản lý người dùng (thêm, sửa, xóa)' },
      
      // Promotions
      { code: PERMISSIONS.PROMOTIONS_VIEW, resource: 'promotions', action: 'view', description: 'Xem danh sách khuyến mãi' },
      { code: PERMISSIONS.PROMOTIONS_CREATE, resource: 'promotions', action: 'create', description: 'Tạo khuyến mãi mới' },
      { code: PERMISSIONS.PROMOTIONS_UPDATE, resource: 'promotions', action: 'update', description: 'Cập nhật khuyến mãi' },
      { code: PERMISSIONS.PROMOTIONS_DELETE, resource: 'promotions', action: 'delete', description: 'Xóa khuyến mãi' },
      
      // Revenue
      { code: PERMISSIONS.REVENUE_VIEW, resource: 'revenue', action: 'view', description: 'Xem báo cáo doanh thu' },
      { code: PERMISSIONS.REVENUE_EXPORT, resource: 'revenue', action: 'export', description: 'Xuất báo cáo doanh thu' },
      
      // Events
      { code: PERMISSIONS.EVENTS_VIEW, resource: 'events', action: 'view', description: 'Xem danh sách sự kiện' },
      { code: PERMISSIONS.EVENTS_CREATE, resource: 'events', action: 'create', description: 'Tạo sự kiện mới' },
      { code: PERMISSIONS.EVENTS_UPDATE, resource: 'events', action: 'update', description: 'Cập nhật sự kiện' },
      { code: PERMISSIONS.EVENTS_DELETE, resource: 'events', action: 'delete', description: 'Xóa sự kiện' },
      
      // Banners
      { code: PERMISSIONS.BANNERS_VIEW, resource: 'banners', action: 'view', description: 'Xem danh sách banner' },
      { code: PERMISSIONS.BANNERS_CREATE, resource: 'banners', action: 'create', description: 'Tạo banner mới' },
      { code: PERMISSIONS.BANNERS_UPDATE, resource: 'banners', action: 'update', description: 'Cập nhật banner' },
      { code: PERMISSIONS.BANNERS_DELETE, resource: 'banners', action: 'delete', description: 'Xóa banner' },
      
      // Roles
      { code: PERMISSIONS.ROLES_VIEW, resource: 'roles', action: 'view', description: 'Xem danh sách nhóm quyền' },
      { code: PERMISSIONS.ROLES_CREATE, resource: 'roles', action: 'create', description: 'Tạo nhóm quyền mới' },
      { code: PERMISSIONS.ROLES_UPDATE, resource: 'roles', action: 'update', description: 'Cập nhật nhóm quyền' },
      { code: PERMISSIONS.ROLES_DELETE, resource: 'roles', action: 'delete', description: 'Xóa nhóm quyền' },
      
      // Permissions
      { code: PERMISSIONS.PERMISSIONS_VIEW, resource: 'permissions', action: 'view', description: 'Xem danh sách quyền' },
      { code: PERMISSIONS.PERMISSIONS_CREATE, resource: 'permissions', action: 'create', description: 'Tạo quyền mới' },
      { code: PERMISSIONS.PERMISSIONS_UPDATE, resource: 'permissions', action: 'update', description: 'Cập nhật quyền' },
      { code: PERMISSIONS.PERMISSIONS_DELETE, resource: 'permissions', action: 'delete', description: 'Xóa quyền' },
      
      // Accounts
      { code: PERMISSIONS.ACCOUNTS_CREATE, resource: 'accounts', action: 'create', description: 'Tạo tài khoản' },
      { code: PERMISSIONS.ACCOUNTS_ASSIGN_ROLE, resource: 'accounts', action: 'assign-role', description: 'Gán nhóm quyền cho tài khoản' },
    ];

    const createdPermissions = [];
    for (const perm of permissionData) {
      const created = await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: perm,
      });
      createdPermissions.push(created);
    }
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // 2. Create Roles
    console.log('👥 Creating roles...');
    
    // Admin role - Full permissions
    const adminRole = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: {
        code: 'ADMIN',
        name: 'Quản trị viên',
        description: 'Full quyền - Quản trị toàn bộ hệ thống',
      },
    });

    // ContentManager role - Content-related permissions
    const contentManagerRole = await prisma.role.upsert({
      where: { code: 'CONTENT_MANAGER' },
      update: {},
      create: {
        code: 'CONTENT_MANAGER',
        name: 'Quản lý nội dung',
        description: 'Quản lý nội dung trên web (phim, sự kiện, banner)',
      },
    });

    console.log(`✅ Created 2 default roles: ADMIN, CONTENT_MANAGER`);

    // 3. Assign Permissions to Roles
    console.log('🔗 Assigning permissions to roles...');

    // Admin - All permissions
    const adminPermissionIds = createdPermissions.map(p => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    // SQLite doesn't support skipDuplicates, so we create one by one
    for (const permissionId of adminPermissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId,
        },
      });
    }
    console.log(`✅ Assigned all ${adminPermissionIds.length} permissions to ADMIN`);

    // ContentManager - Movies (view, create, update), Events, Banners
    const contentManagerPerms = createdPermissions.filter(p => 
      p.code.startsWith('movies:') && p.code !== 'movies:delete' ||
      p.code.startsWith('events:') ||
      p.code.startsWith('banners:') ||
      p.code.startsWith('promotions:')
    );
    const contentManagerPermissionIds = contentManagerPerms.map(p => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: contentManagerRole.id } });
    // SQLite doesn't support skipDuplicates, so we create one by one
    for (const permissionId of contentManagerPermissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: contentManagerRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: contentManagerRole.id,
          permissionId,
        },
      });
    }
    console.log(`✅ Assigned ${contentManagerPermissionIds.length} permissions to CONTENT_MANAGER`);

    // 4. Assign Admin role to existing ADMIN users
    console.log('👤 Assigning ADMIN role to existing ADMIN users...');
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (adminUsers.length > 0) {
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
    } else {
      console.log('⚠️  No existing ADMIN users found');
    }

    console.log('✅ Seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRolesAndPermissions()
    .then(() => {
      console.log('🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed:', error);
      process.exit(1);
    });
}

module.exports = { seedRolesAndPermissions };

