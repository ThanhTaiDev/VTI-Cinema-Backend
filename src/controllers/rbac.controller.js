const rbacService = require('../services/rbac.service');

/**
 * Role Controllers
 */
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await rbacService.getAllRoles();
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const role = await rbacService.getRoleById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (err) {
    next(err);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const role = await rbacService.createRole(req.body);
    res.status(201).json(role);
  } catch (err) {
    // Handle unique constraint error
    if (err.message && err.message.includes('already exists')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        message: `Role with code "${req.body.code?.toUpperCase()}" already exists` 
      });
    }
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const role = await rbacService.updateRole(req.params.id, req.body);
    res.json(role);
  } catch (err) {
    next(err);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    await rbacService.deleteRole(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateRolePermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'permissionIds must be an array' });
    }
    const role = await rbacService.updateRolePermissions(req.params.id, permissionIds);
    res.json(role);
  } catch (err) {
    next(err);
  }
};

/**
 * Permission Controllers
 */
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await rbacService.getAllPermissions(req.query);
    res.json(permissions);
  } catch (err) {
    next(err);
  }
};

exports.getPermissionsGrouped = async (req, res, next) => {
  try {
    const grouped = await rbacService.getPermissionsGroupedByResource();
    res.json(grouped);
  } catch (err) {
    next(err);
  }
};

exports.getPermissionById = async (req, res, next) => {
  try {
    const permission = await rbacService.getPermissionById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    res.json(permission);
  } catch (err) {
    next(err);
  }
};

exports.createPermission = async (req, res, next) => {
  try {
    const permission = await rbacService.createPermission(req.body);
    res.status(201).json(permission);
  } catch (err) {
    next(err);
  }
};

exports.updatePermission = async (req, res, next) => {
  try {
    const permission = await rbacService.updatePermission(req.params.id, req.body);
    res.json(permission);
  } catch (err) {
    next(err);
  }
};

exports.deletePermission = async (req, res, next) => {
  try {
    await rbacService.deletePermission(req.params.id);
    res.json({ message: 'Permission deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * User Role Controllers
 */
exports.getUserRoles = async (req, res, next) => {
  try {
    const roles = await rbacService.getUserRoles(req.params.id);
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

exports.assignUserRoles = async (req, res, next) => {
  try {
    const { roleIds } = req.body;
    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ message: 'roleIds must be an array' });
    }
    const roles = await rbacService.assignUserRoles(req.params.id, roleIds);
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

