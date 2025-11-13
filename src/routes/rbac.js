const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const rbacController = require('../controllers/rbac.controller');
const PERMISSIONS = require('../config/permissions');

// Roles routes - require roles:view/create/update/delete permissions
router.get('/admin/roles', authenticate, authorize(PERMISSIONS.ROLES_VIEW), rbacController.getAllRoles);
router.get('/admin/roles/:id', authenticate, authorize(PERMISSIONS.ROLES_VIEW), rbacController.getRoleById);
router.post('/admin/roles', authenticate, authorize(PERMISSIONS.ROLES_CREATE), rbacController.createRole);
router.put('/admin/roles/:id', authenticate, authorize(PERMISSIONS.ROLES_UPDATE), rbacController.updateRole);
router.delete('/admin/roles/:id', authenticate, authorize(PERMISSIONS.ROLES_DELETE), rbacController.deleteRole);
router.put('/admin/roles/:id/permissions', authenticate, authorize(PERMISSIONS.ROLES_UPDATE), rbacController.updateRolePermissions);

// Permissions routes - require permissions:view/create/update/delete permissions
router.get('/admin/permissions', authenticate, authorize(PERMISSIONS.PERMISSIONS_VIEW), rbacController.getAllPermissions);
router.get('/admin/permissions/grouped', authenticate, authorize(PERMISSIONS.PERMISSIONS_VIEW), rbacController.getPermissionsGrouped);
router.get('/admin/permissions/:id', authenticate, authorize(PERMISSIONS.PERMISSIONS_VIEW), rbacController.getPermissionById);
router.post('/admin/permissions', authenticate, authorize(PERMISSIONS.PERMISSIONS_CREATE), rbacController.createPermission);
router.put('/admin/permissions/:id', authenticate, authorize(PERMISSIONS.PERMISSIONS_UPDATE), rbacController.updatePermission);
router.delete('/admin/permissions/:id', authenticate, authorize(PERMISSIONS.PERMISSIONS_DELETE), rbacController.deletePermission);

// User roles routes - require accounts:assign-role permission
router.get('/admin/users/:id/roles', authenticate, authorize(PERMISSIONS.ACCOUNTS_ASSIGN_ROLE), rbacController.getUserRoles);
router.put('/admin/users/:id/roles', authenticate, authorize(PERMISSIONS.ACCOUNTS_ASSIGN_ROLE), rbacController.assignUserRoles);

module.exports = router;

