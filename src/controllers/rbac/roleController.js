const roleService = require('../../services/rbac/roleService');

/**
 * Get all roles
 * GET /api/admin/roles
 */
exports.getAll = async (req, res, next) => {
  try {
    const roles = await roleService.getAll();
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

/**
 * Get role by ID
 * GET /api/admin/roles/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const role = await roleService.getById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (err) {
    next(err);
  }
};

/**
 * Create role
 * POST /api/admin/roles
 */
exports.create = async (req, res, next) => {
  try {
    const role = await roleService.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
};

/**
 * Update role
 * PUT /api/admin/roles/:id
 */
exports.update = async (req, res, next) => {
  try {
    const role = await roleService.update(req.params.id, req.body);
    res.json(role);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete role
 * DELETE /api/admin/roles/:id
 */
exports.delete = async (req, res, next) => {
  try {
    await roleService.delete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Update role permissions
 * PUT /api/admin/roles/:id/permissions
 */
exports.updatePermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'permissionIds must be an array' });
    }
    const role = await roleService.updatePermissions(req.params.id, permissionIds);
    res.json(role);
  } catch (err) {
    next(err);
  }
};

