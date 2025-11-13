const prisma = require('../../prismaClient');

/**
 * Get all permissions
 */
exports.getAll = async (params = {}) => {
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
exports.getById = async (id) => {
  return await prisma.permission.findUnique({
    where: { id },
  });
};

/**
 * Get permission by code
 */
exports.getByCode = async (code) => {
  return await prisma.permission.findUnique({
    where: { code },
  });
};

/**
 * Create permission
 */
exports.create = async (data) => {
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
exports.update = async (id, data) => {
  const { description } = data;

  return await prisma.permission.update({
    where: { id },
    data: { description },
  });
};

/**
 * Delete permission
 */
exports.delete = async (id) => {
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
exports.getGroupedByResource = async () => {
  const permissions = await exports.getAll();
  
  const grouped = {};
  for (const perm of permissions) {
    if (!grouped[perm.resource]) {
      grouped[perm.resource] = [];
    }
    grouped[perm.resource].push(perm);
  }

  return grouped;
};

