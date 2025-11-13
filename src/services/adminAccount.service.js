const prisma = require('../prismaClient');

/**
 * Admin Account Service - Extended user management with RBAC
 */

/**
 * List accounts with roles and permissions
 */
exports.listAccounts = async (params = {}) => {
  const {
    page = 1,
    limit = 20,
    role = null, // Filter by role code
    status = null,
    q = null, // Search query
    sort = 'createdAt:desc',
  } = params;

  const skip = (page - 1) * limit;
  const where = {};

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Search by email/name (SQLite doesn't support case-insensitive, filter in memory)
  // We'll filter after fetching for SQLite compatibility

  // Filter by role (if role code provided)
  if (role) {
    const roleRecord = await prisma.role.findUnique({
      where: { code: role },
    });
    if (roleRecord) {
      where.userRoles = {
        some: {
          roleId: roleRecord.id,
        },
      };
    }
  }

  // Parse sort
  const [sortField, sortOrder] = sort.split(':');
  const orderBy = {};
  if (sortField === 'name') orderBy.name = sortOrder || 'asc';
  else if (sortField === 'email') orderBy.email = sortOrder || 'asc';
  else if (sortField === 'createdAt') orderBy.createdAt = sortOrder || 'desc';
  else orderBy.createdAt = 'desc';

  // Build base where for count (without search)
  const countWhere = { ...where };
  delete countWhere.OR;

  // Get users with roles
  let users = await prisma.user.findMany({
    where: countWhere,
    skip,
    take: parseInt(limit) * 2, // Fetch more to account for search filtering
    orderBy,
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Filter by search query in memory (SQLite compatibility)
  if (q) {
    const searchLower = q.toLowerCase();
    users = users.filter(user =>
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.uid?.toLowerCase().includes(searchLower)
    );
  }

  // Apply limit after filtering
  users = users.slice(0, parseInt(limit));

  // Get total count (approximate for search)
  let total = await prisma.user.count({ where: countWhere });
  if (q) {
    // For search, use filtered count
    total = users.length; // Approximate, could be improved
  }

  // Map users to include roles and permissions
  const mappedUsers = users.map(user => {
    const roles = user.userRoles.map(ur => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
    }));

    // Collect all permissions from all roles
    const permissionSet = new Set();
    user.userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        if (rp.permission) {
          permissionSet.add(rp.permission.code);
        }
      });
    });

    return {
      ...user,
      roles,
      permissions: Array.from(permissionSet),
    };
  });

  return {
    data: mappedUsers,
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get account by ID with full details
 */
exports.getAccountById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const roles = user.userRoles.map(ur => ({
    id: ur.role.id,
    code: ur.role.code,
    name: ur.role.name,
    description: ur.role.description,
    permissions: ur.role.rolePermissions.map(rp => ({
      code: rp.permission.code,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
    })),
  }));

  const permissionSet = new Set();
  user.userRoles.forEach(ur => {
    ur.role.rolePermissions.forEach(rp => {
      if (rp.permission) {
        permissionSet.add(rp.permission.code);
      }
    });
  });

  return {
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role, // Legacy
    status: user.status,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles,
    permissions: Array.from(permissionSet),
  };
};

/**
 * Bulk actions on accounts
 */
exports.bulkAction = async (action, userIds, payload = {}) => {
  const results = [];

  for (const userId of userIds) {
    try {
      let result = { userId, success: false, message: '' };

      switch (action) {
        case 'activate':
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
          });
          result.success = true;
          result.message = 'Activated';
          break;

        case 'deactivate':
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'INACTIVE' },
          });
          result.success = true;
          result.message = 'Deactivated';
          break;

        case 'assignRole':
          if (payload.roleCode) {
            const role = await prisma.role.findUnique({
              where: { code: payload.roleCode },
            });
            if (role) {
              // Check if already assigned
              const existing = await prisma.userRole.findUnique({
                where: {
                  userId_roleId: {
                    userId,
                    roleId: role.id,
                  },
                },
              });
              if (!existing) {
                await prisma.userRole.create({
                  data: {
                    userId,
                    roleId: role.id,
                  },
                });
              }
              result.success = true;
              result.message = `Assigned role ${payload.roleCode}`;
            } else {
              result.message = `Role ${payload.roleCode} not found`;
            }
          }
          break;

        case 'removeRole':
          if (payload.roleCode) {
            const role = await prisma.role.findUnique({
              where: { code: payload.roleCode },
            });
            if (role) {
              await prisma.userRole.deleteMany({
                where: {
                  userId,
                  roleId: role.id,
                },
              });
              result.success = true;
              result.message = `Removed role ${payload.roleCode}`;
            } else {
              result.message = `Role ${payload.roleCode} not found`;
            }
          }
          break;

        default:
          result.message = `Unknown action: ${action}`;
      }

      results.push(result);
    } catch (err) {
      results.push({
        userId,
        success: false,
        message: err.message || 'Error',
      });
    }
  }

  return results;
};

/**
 * Export accounts to CSV
 */
exports.exportAccountsCSV = async (filters = {}) => {
  const accounts = await exports.listAccounts({ ...filters, limit: 10000 });
  
  // CSV header
  const headers = ['ID', 'UID', 'Name', 'Email', 'Phone', 'Roles', 'Permissions', 'Status', 'Created At'];
  
  // CSV rows
  const rows = accounts.data.map(user => [
    user.id,
    user.uid || '',
    user.name || '',
    user.email || '',
    user.phone || '',
    user.roles.map(r => r.code).join(', '),
    user.permissions.join(', '),
    user.status || '',
    user.createdAt ? new Date(user.createdAt).toISOString() : '',
  ]);

  // Combine header and rows
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ];

  return csvLines.join('\n');
};

/**
 * Get account statistics
 */
exports.stats = async () => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    allUsers,
    allRoles,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.role.findMany({
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    }),
  ]);

  // Count users per role
  const rolesCount = {};
  allRoles.forEach(role => {
    rolesCount[role.code] = role._count.userRoles;
  });

  // Recent signups (last 10)
  const recentSignups = allUsers.slice(0, 10).map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    roles: user.userRoles.map(ur => ur.role.code),
  }));

  // New users in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newUsers7d = await prisma.user.count({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  });

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    newUsers7d,
    rolesCount,
    recentSignups,
  };
};

