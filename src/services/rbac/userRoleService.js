const prisma = require('../../prismaClient');

/**
 * Get user roles
 */
exports.getUserRoles = async (userId) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
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
  });

  return userRoles.map(ur => ur.role);
};

/**
 * Get user permissions (from all roles)
 */
exports.getUserPermissions = async (userId) => {
  const userRoles = await exports.getUserRoles(userId);
  
  const permissionMap = new Map();
  for (const role of userRoles) {
    for (const rp of role.rolePermissions) {
      permissionMap.set(rp.permission.code, rp.permission);
    }
  }

  return Array.from(permissionMap.values());
};

/**
 * Check if user has permission
 */
exports.hasPermission = async (userId, permissionCode) => {
  const permissions = await exports.getUserPermissions(userId);
  return permissions.some(p => p.code === permissionCode);
};

/**
 * Check if user has any of the required permissions
 */
exports.hasAnyPermission = async (userId, permissionCodes) => {
  if (!Array.isArray(permissionCodes)) {
    permissionCodes = [permissionCodes];
  }

  const permissions = await exports.getUserPermissions(userId);
  const userPermissionCodes = permissions.map(p => p.code);
  
  return permissionCodes.some(code => userPermissionCodes.includes(code));
};

/**
 * Assign roles to user
 */
exports.assignRoles = async (userId, roleIds) => {
  // Delete existing roles
  await prisma.userRole.deleteMany({
    where: { userId },
  });

  if (roleIds.length > 0) {
    for (const roleId of roleIds) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        update: {},
        create: {
          userId,
          roleId,
        },
      });
    }
  }

  return await exports.getUserRoles(userId);
};

/**
 * Add role to user
 */
exports.addRole = async (userId, roleId) => {
  return await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    update: {},
    create: {
      userId,
      roleId,
    },
    include: {
      role: true,
    },
  });
};

/**
 * Remove role from user
 */
exports.removeRole = async (userId, roleId) => {
  return await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });
};

