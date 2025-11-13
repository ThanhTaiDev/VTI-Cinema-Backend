const prisma = require('../../prismaClient');

/**
 * Get all roles with permissions
 */
exports.getAll = async () => {
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
exports.getById = async (id) => {
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
exports.getByCode = async (code) => {
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
exports.create = async (data) => {
  const { code, name, description, permissionIds = [] } = data;

  if (!code || !name) {
    throw new Error('Code and name are required');
  }

  // Create role
  const role = await prisma.role.create({
    data: {
      code: code.toUpperCase(),
      name,
      description,
    },
  });

  // Assign permissions if provided
  if (permissionIds.length > 0) {
    await exports.updatePermissions(role.id, permissionIds);
  }

  return await exports.getById(role.id);
};

/**
 * Update role
 */
exports.update = async (id, data) => {
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
exports.delete = async (id) => {
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
exports.updatePermissions = async (roleId, permissionIds) => {
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

  return await exports.getById(roleId);
};

