const prisma = require('../prismaClient');

/**
 * RBAC Service - Unified service for roles, permissions, and user roles
 */

// ==================== ROLES ====================

/**
 * Get all roles with permissions
 */
exports.getAllRoles = async () => {
  return await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { userRoles: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Get role by ID with permissions
 */
exports.getRoleById = async (id) => {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { userRoles: true },
      },
    },
  });
};

/**
 * Get role by code
 */
exports.getRoleByCode = async (code) => {
  return await prisma.role.findUnique({
    where: { code },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
};

/**
 * Create role
 */
exports.createRole = async (data) => {
  const { code, name, description, permissions = [], permissionIds = [] } = data;

  if (!code || !name) {
    throw new Error('Code and name are required');
  }

  const roleCode = code.toUpperCase();

  // Check if role code already exists
  const existingRole = await prisma.role.findUnique({
    where: { code: roleCode },
  });

  if (existingRole) {
    throw new Error(`Role with code "${roleCode}" already exists`);
  }

  // Use permissionIds if provided, otherwise use permissions
  const permIds = permissionIds.length > 0 ? permissionIds : permissions;

  // Create role
  const role = await prisma.role.create({
    data: {
      code: roleCode,
      name,
      description,
    },
  });

  // Assign permissions if provided
  if (permIds.length > 0) {
    await exports.updateRolePermissions(role.id, permIds);
  }

  return await exports.getRoleById(role.id);
};

/**
 * Update role
 */
exports.updateRole = async (id, data) => {
  const { name, description } = data;

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  return await prisma.role.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete role
 */
exports.deleteRole = async (id) => {
  // Check if role is assigned to any users
  const userCount = await prisma.userRole.count({
    where: { roleId: id },
  });

  if (userCount > 0) {
    throw new Error(`Cannot delete role: ${userCount} user(s) are assigned to this role`);
  }

  return await prisma.role.delete({
    where: { id },
  });
};

/**
 * Update role permissions
 */
exports.updateRolePermissions = async (roleId, permissionIds) => {
  // Delete existing permissions
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  if (permissionIds.length > 0) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  return await exports.getRoleById(roleId);
};

// ==================== PERMISSIONS ====================

/**
 * Get all permissions
 */
exports.getAllPermissions = async (params = {}) => {
  const { resource } = params;
  
  const where = {};
  if (resource) {
    where.resource = resource;
  }

  return await prisma.permission.findMany({
    where,
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' },
    ],
  });
};

/**
 * Get permission by ID
 */
exports.getPermissionById = async (id) => {
  return await prisma.permission.findUnique({
    where: { id },
  });
};

/**
 * Get permission by code
 */
exports.getPermissionByCode = async (code) => {
  return await prisma.permission.findUnique({
    where: { code },
  });
};

/**
 * Create permission
 */
exports.createPermission = async (data) => {
  const { code, resource, action, description } = data;

  if (!code || !resource || !action) {
    throw new Error('Code, resource, and action are required');
  }

  return await prisma.permission.create({
    data: {
      code,
      resource,
      action,
      description,
    },
  });
};

/**
 * Update permission
 */
exports.updatePermission = async (id, data) => {
  const { description } = data;

  return await prisma.permission.update({
    where: { id },
    data: { description },
  });
};

/**
 * Delete permission
 */
exports.deletePermission = async (id) => {
  // Check if permission is assigned to any roles
  const roleCount = await prisma.rolePermission.count({
    where: { permissionId: id },
  });

  if (roleCount > 0) {
    throw new Error(`Cannot delete permission: ${roleCount} role(s) are using this permission`);
  }

  return await prisma.permission.delete({
    where: { id },
  });
};

/**
 * Get permissions grouped by resource
 */
exports.getPermissionsGroupedByResource = async () => {
  const permissions = await exports.getAllPermissions();
  
  const grouped = {};
  for (const perm of permissions) {
    if (!grouped[perm.resource]) {
      grouped[perm.resource] = [];
    }
    grouped[perm.resource].push(perm);
  }

  return grouped;
};

// ==================== USER ROLES ====================

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
    if (role.rolePermissions && role.rolePermissions.length > 0) {
      for (const rp of role.rolePermissions) {
        if (rp.permission) {
          permissionMap.set(rp.permission.code, rp.permission);
        }
      }
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
exports.assignUserRoles = async (userId, roleIds) => {
  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Delete existing roles
    await tx.userRole.deleteMany({
      where: { userId },
    });

    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        await tx.userRole.upsert({
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
  });
};

/**
 * Add role to user
 */
exports.addUserRole = async (userId, roleId) => {
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
exports.removeUserRole = async (userId, roleId) => {
  return await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });
};

