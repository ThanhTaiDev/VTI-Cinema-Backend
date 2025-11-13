const permissionService = require('../../services/rbac/permissionService');

/**
 * Get all permissions
 * GET /api/admin/permissions
 */
exports.getAll = async (req, res, next) => {
  try {
    const permissions = await permissionService.getAll(req.query);
    res.json(permissions);
  } catch (err) {
    next(err);
  }
};

/**
 * Get permissions grouped by resource
 * GET /api/admin/permissions/grouped
 */
exports.getGrouped = async (req, res, next) => {
  try {
    const grouped = await permissionService.getGroupedByResource();
    res.json(grouped);
  } catch (err) {
    next(err);
  }
};

/**
 * Get permission by ID
 * GET /api/admin/permissions/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const permission = await permissionService.getById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    res.json(permission);
  } catch (err) {
    next(err);
  }
};

/**
 * Create permission
 * POST /api/admin/permissions
 */
exports.create = async (req, res, next) => {
  try {
    const permission = await permissionService.create(req.body);
    res.status(201).json(permission);
  } catch (err) {
    next(err);
  }
};

/**
 * Update permission
 * PUT /api/admin/permissions/:id
 */
exports.update = async (req, res, next) => {
  try {
    const permission = await permissionService.update(req.params.id, req.body);
    res.json(permission);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete permission
 * DELETE /api/admin/permissions/:id
 */
exports.delete = async (req, res, next) => {
  try {
    await permissionService.delete(req.params.id);
    res.json({ message: 'Permission deleted successfully' });
  } catch (err) {
    next(err);
  }
};

