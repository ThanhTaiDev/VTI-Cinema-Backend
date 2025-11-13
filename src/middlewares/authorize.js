const rbacService = require('../services/rbac.service');

/**
 * Authorization middleware - Check if user has required permission(s)
 * 
 * Usage:
 *   authorize('movies:view')
 *   authorize(['movies:view', 'movies:create'])
 *   authorize('movies:view', 'movies:create') // Multiple args
 * 
 * If user has ANY of the required permissions, allow access.
 * If user has ADMIN role (legacy), allow all access.
 */
const authorize = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Flatten permissions array (handle both array and multiple args)
      const permissions = requiredPermissions.flat();

      if (permissions.length === 0) {
        return res.status(500).json({ message: 'No permissions specified for authorization' });
      }

      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Legacy: If user has ADMIN role (string), allow all
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Check RBAC permissions
      const hasPermission = await rbacService.hasAnyPermission(
        req.user.id,
        permissions
      );

      if (!hasPermission) {
        return res.status(403).json({
          message: 'Forbidden - Insufficient permissions',
          required: permissions,
        });
      }

      next();
    } catch (error) {
      console.error('[Authorize] Error:', error);
      return res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

/**
 * Alternative: authorize by resource and action
 * authorizeResource('movies', 'view')
 */
const authorizeResource = (resource, action) => {
  return authorize(`${resource}:${action}`);
};

module.exports = { authorize, authorizeResource };

