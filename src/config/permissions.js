/**
 * Permission definitions for RBAC system
 * Format: resource:action
 */
module.exports = {
  // Movies
  MOVIES_VIEW: 'movies:view',
  MOVIES_CREATE: 'movies:create',
  MOVIES_UPDATE: 'movies:update',
  MOVIES_DELETE: 'movies:delete',

  // Cinemas
  CINEMAS_VIEW: 'cinemas:view',
  CINEMAS_CREATE: 'cinemas:create',
  CINEMAS_UPDATE: 'cinemas:update',
  CINEMAS_DELETE: 'cinemas:delete',

  // Screenings
  SCREENINGS_VIEW: 'screenings:view',
  SCREENINGS_CREATE: 'screenings:create',
  SCREENINGS_UPDATE: 'screenings:update',
  SCREENINGS_DELETE: 'screenings:delete',
  SCREENINGS_MANAGE: 'screenings:manage', // Alias for create/update/delete

  // Tickets
  TICKETS_VIEW: 'tickets:view',
  TICKETS_ISSUE: 'tickets:issue',
  TICKETS_REFUND: 'tickets:refund',
  TICKETS_MANAGE: 'tickets:manage', // Alias for issue/refund/lock/unlock

  // Payments
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_REFUND: 'payments:refund',
  PAYMENTS_GATEWAY_CONFIG: 'payments:gateway-config',
  PAYMENTS_EXPORT: 'payments:export',

  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE: 'users:manage', // Alias for create/update/delete

  // Promotions
  PROMOTIONS_VIEW: 'promotions:view',
  PROMOTIONS_CREATE: 'promotions:create',
  PROMOTIONS_UPDATE: 'promotions:update',
  PROMOTIONS_DELETE: 'promotions:delete',

  // Revenue
  REVENUE_VIEW: 'revenue:view',
  REVENUE_EXPORT: 'revenue:export',

  // Events
  EVENTS_VIEW: 'events:view',
  EVENTS_CREATE: 'events:create',
  EVENTS_UPDATE: 'events:update',
  EVENTS_DELETE: 'events:delete',

  // Banners
  BANNERS_VIEW: 'banners:view',
  BANNERS_CREATE: 'banners:create',
  BANNERS_UPDATE: 'banners:update',
  BANNERS_DELETE: 'banners:delete',

  // Roles
  ROLES_VIEW: 'roles:view',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Permissions
  PERMISSIONS_VIEW: 'permissions:view',
  PERMISSIONS_CREATE: 'permissions:create',
  PERMISSIONS_UPDATE: 'permissions:update',
  PERMISSIONS_DELETE: 'permissions:delete',

  // Accounts
  ACCOUNTS_CREATE: 'accounts:create',
  ACCOUNTS_ASSIGN_ROLE: 'accounts:assign-role',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
};

/**
 * Get all permission codes as array
 */
module.exports.getAllPermissions = () => {
  return Object.values(module.exports).filter(v => typeof v === 'string');
};

/**
 * Get permissions by resource
 */
module.exports.getByResource = (resource) => {
  return Object.entries(module.exports)
    .filter(([_, value]) => typeof value === 'string' && value.startsWith(`${resource}:`))
    .map(([_, value]) => value);
};

