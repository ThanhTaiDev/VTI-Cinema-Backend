const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PERMISSIONS = require('../src/config/permissions');

/**
 * Seed Permissions - Danh sách quyền đầy đủ
 * Run: node scripts/seedPermissions.js
 * 
 * Tạo tất cả các quyền cho hệ thống quản lý rạp chiếu phim
 */
async function seedPermissions() {
  console.log('🌱 Bắt đầu seed danh sách quyền...\n');

  try {
    // Định nghĩa đầy đủ tất cả các quyền
    const permissionData = [
      // ========== DASHBOARD (Trang chủ) ==========
      {
        code: PERMISSIONS.DASHBOARD_VIEW,
        resource: 'dashboard',
        action: 'view',
        description: 'Xem trang chủ/dashboard quản trị'
      },

      // ========== MOVIES (Quản lý phim) ==========
      {
        code: PERMISSIONS.MOVIES_VIEW,
        resource: 'movies',
        action: 'view',
        description: 'Xem danh sách phim'
      },
      {
        code: PERMISSIONS.MOVIES_CREATE,
        resource: 'movies',
        action: 'create',
        description: 'Thêm phim mới'
      },
      {
        code: PERMISSIONS.MOVIES_UPDATE,
        resource: 'movies',
        action: 'update',
        description: 'Cập nhật thông tin phim'
      },
      {
        code: PERMISSIONS.MOVIES_DELETE,
        resource: 'movies',
        action: 'delete',
        description: 'Xóa phim'
      },

      // ========== CINEMAS (Quản lý rạp phim) ==========
      {
        code: PERMISSIONS.CINEMAS_VIEW,
        resource: 'cinemas',
        action: 'view',
        description: 'Xem danh sách rạp phim'
      },
      {
        code: PERMISSIONS.CINEMAS_CREATE,
        resource: 'cinemas',
        action: 'create',
        description: 'Thêm rạp phim mới'
      },
      {
        code: PERMISSIONS.CINEMAS_UPDATE,
        resource: 'cinemas',
        action: 'update',
        description: 'Cập nhật thông tin rạp phim'
      },
      {
        code: PERMISSIONS.CINEMAS_DELETE,
        resource: 'cinemas',
        action: 'delete',
        description: 'Xóa rạp phim'
      },

      // ========== ROOMS (Quản lý phòng chiếu) ==========
      {
        code: PERMISSIONS.ROOMS_VIEW,
        resource: 'rooms',
        action: 'view',
        description: 'Xem danh sách phòng chiếu'
      },
      {
        code: PERMISSIONS.ROOMS_CREATE,
        resource: 'rooms',
        action: 'create',
        description: 'Thêm phòng chiếu mới'
      },
      {
        code: PERMISSIONS.ROOMS_UPDATE,
        resource: 'rooms',
        action: 'update',
        description: 'Cập nhật thông tin phòng chiếu'
      },
      {
        code: PERMISSIONS.ROOMS_DELETE,
        resource: 'rooms',
        action: 'delete',
        description: 'Xóa phòng chiếu'
      },
      {
        code: PERMISSIONS.ROOMS_MANAGE,
        resource: 'rooms',
        action: 'manage',
        description: 'Quản lý phòng chiếu (thêm, sửa, xóa)'
      },

      // ========== SEATS (Quản lý ghế) ==========
      {
        code: PERMISSIONS.SEATS_VIEW,
        resource: 'seats',
        action: 'view',
        description: 'Xem danh sách ghế'
      },
      {
        code: PERMISSIONS.SEATS_CREATE,
        resource: 'seats',
        action: 'create',
        description: 'Thêm ghế mới'
      },
      {
        code: PERMISSIONS.SEATS_UPDATE,
        resource: 'seats',
        action: 'update',
        description: 'Cập nhật thông tin ghế'
      },
      {
        code: PERMISSIONS.SEATS_DELETE,
        resource: 'seats',
        action: 'delete',
        description: 'Xóa ghế'
      },
      {
        code: PERMISSIONS.SEATS_MANAGE,
        resource: 'seats',
        action: 'manage',
        description: 'Quản lý ghế (thêm, sửa, xóa)'
      },

      // ========== SCREENINGS (Quản lý suất chiếu) ==========
      {
        code: PERMISSIONS.SCREENINGS_VIEW,
        resource: 'screenings',
        action: 'view',
        description: 'Xem danh sách suất chiếu'
      },
      {
        code: PERMISSIONS.SCREENINGS_CREATE,
        resource: 'screenings',
        action: 'create',
        description: 'Thêm suất chiếu mới'
      },
      {
        code: PERMISSIONS.SCREENINGS_UPDATE,
        resource: 'screenings',
        action: 'update',
        description: 'Cập nhật suất chiếu'
      },
      {
        code: PERMISSIONS.SCREENINGS_DELETE,
        resource: 'screenings',
        action: 'delete',
        description: 'Xóa suất chiếu'
      },
      {
        code: PERMISSIONS.SCREENINGS_MANAGE,
        resource: 'screenings',
        action: 'manage',
        description: 'Quản lý suất chiếu (thêm, sửa, xóa)'
      },

      // ========== TICKETS (Quản lý vé) ==========
      {
        code: PERMISSIONS.TICKETS_VIEW,
        resource: 'tickets',
        action: 'view',
        description: 'Xem danh sách vé'
      },
      {
        code: PERMISSIONS.TICKETS_ISSUE,
        resource: 'tickets',
        action: 'issue',
        description: 'Phát hành vé'
      },
      {
        code: PERMISSIONS.TICKETS_REFUND,
        resource: 'tickets',
        action: 'refund',
        description: 'Hoàn tiền vé'
      },
      {
        code: PERMISSIONS.TICKETS_MANAGE,
        resource: 'tickets',
        action: 'manage',
        description: 'Quản lý vé (phát hành, hoàn tiền, khóa, hủy)'
      },

      // ========== ORDERS (Quản lý đơn hàng) ==========
      {
        code: PERMISSIONS.ORDERS_VIEW,
        resource: 'orders',
        action: 'view',
        description: 'Xem danh sách đơn hàng'
      },
      {
        code: PERMISSIONS.ORDERS_CREATE,
        resource: 'orders',
        action: 'create',
        description: 'Tạo đơn hàng mới'
      },
      {
        code: PERMISSIONS.ORDERS_UPDATE,
        resource: 'orders',
        action: 'update',
        description: 'Cập nhật đơn hàng'
      },
      {
        code: PERMISSIONS.ORDERS_DELETE,
        resource: 'orders',
        action: 'delete',
        description: 'Xóa đơn hàng'
      },
      {
        code: PERMISSIONS.ORDERS_REFUND,
        resource: 'orders',
        action: 'refund',
        description: 'Hoàn tiền đơn hàng'
      },
      {
        code: PERMISSIONS.ORDERS_MANAGE,
        resource: 'orders',
        action: 'manage',
        description: 'Quản lý đơn hàng (thêm, sửa, xóa, hoàn tiền)'
      },

      // ========== PAYMENTS (Quản lý thanh toán) ==========
      {
        code: PERMISSIONS.PAYMENTS_VIEW,
        resource: 'payments',
        action: 'view',
        description: 'Xem danh sách thanh toán'
      },
      {
        code: PERMISSIONS.PAYMENTS_REFUND,
        resource: 'payments',
        action: 'refund',
        description: 'Hoàn tiền thanh toán'
      },
      {
        code: PERMISSIONS.PAYMENTS_GATEWAY_CONFIG,
        resource: 'payments',
        action: 'gateway-config',
        description: 'Cấu hình cổng thanh toán'
      },
      {
        code: PERMISSIONS.PAYMENTS_EXPORT,
        resource: 'payments',
        action: 'export',
        description: 'Xuất báo cáo thanh toán'
      },

      // ========== USERS (Quản lý người dùng) ==========
      {
        code: PERMISSIONS.USERS_VIEW,
        resource: 'users',
        action: 'view',
        description: 'Xem danh sách người dùng'
      },
      {
        code: PERMISSIONS.USERS_CREATE,
        resource: 'users',
        action: 'create',
        description: 'Tạo người dùng mới'
      },
      {
        code: PERMISSIONS.USERS_UPDATE,
        resource: 'users',
        action: 'update',
        description: 'Cập nhật thông tin người dùng'
      },
      {
        code: PERMISSIONS.USERS_DELETE,
        resource: 'users',
        action: 'delete',
        description: 'Xóa người dùng'
      },
      {
        code: PERMISSIONS.USERS_MANAGE,
        resource: 'users',
        action: 'manage',
        description: 'Quản lý người dùng (thêm, sửa, xóa)'
      },

      // ========== ACCOUNTS (Quản lý tài khoản) ==========
      {
        code: PERMISSIONS.ACCOUNTS_VIEW,
        resource: 'accounts',
        action: 'view',
        description: 'Xem danh sách tài khoản'
      },
      {
        code: PERMISSIONS.ACCOUNTS_CREATE,
        resource: 'accounts',
        action: 'create',
        description: 'Tạo tài khoản mới'
      },
      {
        code: PERMISSIONS.ACCOUNTS_UPDATE,
        resource: 'accounts',
        action: 'update',
        description: 'Cập nhật tài khoản'
      },
      {
        code: PERMISSIONS.ACCOUNTS_DELETE,
        resource: 'accounts',
        action: 'delete',
        description: 'Xóa tài khoản'
      },
      {
        code: PERMISSIONS.ACCOUNTS_ASSIGN_ROLE,
        resource: 'accounts',
        action: 'assign-role',
        description: 'Gán nhóm quyền cho tài khoản'
      },
      {
        code: PERMISSIONS.ACCOUNTS_MANAGE,
        resource: 'accounts',
        action: 'manage',
        description: 'Quản lý tài khoản (thêm, sửa, xóa, gán quyền)'
      },

      // ========== PROMOTIONS (Quản lý tin khuyến mãi) ==========
      {
        code: PERMISSIONS.PROMOTIONS_VIEW,
        resource: 'promotions',
        action: 'view',
        description: 'Xem danh sách khuyến mãi'
      },
      {
        code: PERMISSIONS.PROMOTIONS_CREATE,
        resource: 'promotions',
        action: 'create',
        description: 'Tạo khuyến mãi mới'
      },
      {
        code: PERMISSIONS.PROMOTIONS_UPDATE,
        resource: 'promotions',
        action: 'update',
        description: 'Cập nhật khuyến mãi'
      },
      {
        code: PERMISSIONS.PROMOTIONS_DELETE,
        resource: 'promotions',
        action: 'delete',
        description: 'Xóa khuyến mãi'
      },

      // ========== EVENTS (Quản lý sự kiện) ==========
      {
        code: PERMISSIONS.EVENTS_VIEW,
        resource: 'events',
        action: 'view',
        description: 'Xem danh sách sự kiện'
      },
      {
        code: PERMISSIONS.EVENTS_CREATE,
        resource: 'events',
        action: 'create',
        description: 'Tạo sự kiện mới'
      },
      {
        code: PERMISSIONS.EVENTS_UPDATE,
        resource: 'events',
        action: 'update',
        description: 'Cập nhật sự kiện'
      },
      {
        code: PERMISSIONS.EVENTS_DELETE,
        resource: 'events',
        action: 'delete',
        description: 'Xóa sự kiện'
      },

      // ========== BANNERS (Quản lý Banner) ==========
      {
        code: PERMISSIONS.BANNERS_VIEW,
        resource: 'banners',
        action: 'view',
        description: 'Xem danh sách banner'
      },
      {
        code: PERMISSIONS.BANNERS_CREATE,
        resource: 'banners',
        action: 'create',
        description: 'Tạo banner mới'
      },
      {
        code: PERMISSIONS.BANNERS_UPDATE,
        resource: 'banners',
        action: 'update',
        description: 'Cập nhật banner'
      },
      {
        code: PERMISSIONS.BANNERS_DELETE,
        resource: 'banners',
        action: 'delete',
        description: 'Xóa banner'
      },

      // ========== REVENUE (Quản lý doanh thu) ==========
      {
        code: PERMISSIONS.REVENUE_VIEW,
        resource: 'revenue',
        action: 'view',
        description: 'Xem báo cáo doanh thu'
      },
      {
        code: PERMISSIONS.REVENUE_EXPORT,
        resource: 'revenue',
        action: 'export',
        description: 'Xuất báo cáo doanh thu'
      },

      // ========== REVIEWS (Quản lý đánh giá) ==========
      {
        code: PERMISSIONS.REVIEWS_VIEW,
        resource: 'reviews',
        action: 'view',
        description: 'Xem danh sách đánh giá'
      },
      {
        code: PERMISSIONS.REVIEWS_CREATE,
        resource: 'reviews',
        action: 'create',
        description: 'Tạo đánh giá mới'
      },
      {
        code: PERMISSIONS.REVIEWS_UPDATE,
        resource: 'reviews',
        action: 'update',
        description: 'Cập nhật đánh giá'
      },
      {
        code: PERMISSIONS.REVIEWS_DELETE,
        resource: 'reviews',
        action: 'delete',
        description: 'Xóa đánh giá'
      },
      {
        code: PERMISSIONS.REVIEWS_MANAGE,
        resource: 'reviews',
        action: 'manage',
        description: 'Quản lý đánh giá (thêm, sửa, xóa)'
      },

      // ========== ROLES (Quản lý nhóm quyền) ==========
      {
        code: PERMISSIONS.ROLES_VIEW,
        resource: 'roles',
        action: 'view',
        description: 'Xem danh sách nhóm quyền'
      },
      {
        code: PERMISSIONS.ROLES_CREATE,
        resource: 'roles',
        action: 'create',
        description: 'Tạo nhóm quyền mới'
      },
      {
        code: PERMISSIONS.ROLES_UPDATE,
        resource: 'roles',
        action: 'update',
        description: 'Cập nhật nhóm quyền'
      },
      {
        code: PERMISSIONS.ROLES_DELETE,
        resource: 'roles',
        action: 'delete',
        description: 'Xóa nhóm quyền'
      },

      // ========== PERMISSIONS (Quản lý quyền) ==========
      {
        code: PERMISSIONS.PERMISSIONS_VIEW,
        resource: 'permissions',
        action: 'view',
        description: 'Xem danh sách quyền'
      },
      {
        code: PERMISSIONS.PERMISSIONS_CREATE,
        resource: 'permissions',
        action: 'create',
        description: 'Tạo quyền mới'
      },
      {
        code: PERMISSIONS.PERMISSIONS_UPDATE,
        resource: 'permissions',
        action: 'update',
        description: 'Cập nhật quyền'
      },
      {
        code: PERMISSIONS.PERMISSIONS_DELETE,
        resource: 'permissions',
        action: 'delete',
        description: 'Xóa quyền'
      },

      // ========== CONFIG (Cấu hình) ==========
      {
        code: PERMISSIONS.CONFIG_VIEW,
        resource: 'config',
        action: 'view',
        description: 'Xem cấu hình hệ thống'
      },
      {
        code: PERMISSIONS.CONFIG_UPDATE,
        resource: 'config',
        action: 'update',
        description: 'Cập nhật cấu hình hệ thống'
      },
      {
        code: PERMISSIONS.CONFIG_MANAGE,
        resource: 'config',
        action: 'manage',
        description: 'Quản lý cấu hình hệ thống (xem, cập nhật)'
      },
    ];

    console.log(`📝 Đang tạo ${permissionData.length} quyền...\n`);

    const createdPermissions = [];
    const errors = [];

    for (const perm of permissionData) {
      try {
        const created = await prisma.permission.upsert({
          where: { code: perm.code },
          update: {
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          },
          create: perm,
        });
        createdPermissions.push(created);
        console.log(`  ✅ ${perm.code.padEnd(30)} - ${perm.description}`);
      } catch (error) {
        errors.push({ permission: perm.code, error: error.message });
        console.error(`  ❌ ${perm.code.padEnd(30)} - Lỗi: ${error.message}`);
      }
    }

    console.log(`\n📊 Tổng kết:`);
    console.log(`   ✅ Đã tạo/cập nhật: ${createdPermissions.length} quyền`);
    if (errors.length > 0) {
      console.log(`   ❌ Lỗi: ${errors.length} quyền`);
    }

    // Thống kê theo resource
    const statsByResource = {};
    createdPermissions.forEach(perm => {
      if (!statsByResource[perm.resource]) {
        statsByResource[perm.resource] = 0;
      }
      statsByResource[perm.resource]++;
    });

    console.log(`\n📋 Thống kê theo module:`);
    Object.entries(statsByResource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([resource, count]) => {
        console.log(`   ${resource.padEnd(20)} : ${count} quyền`);
      });

    console.log('\n✅ Hoàn thành seed danh sách quyền!');
  } catch (error) {
    console.error('\n❌ Lỗi khi seed quyền:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy nếu được gọi trực tiếp
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('\n🎉 Hoàn tất!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Thất bại:', error);
      process.exit(1);
    });
}

module.exports = { seedPermissions };

