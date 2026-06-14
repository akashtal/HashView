/**
 * Role-Based Access Control (RBAC) Constants
 * HashView Admin Dashboard
 */

// ─── Admin Roles ──────────────────────────────────────────────────────────────
// Note: 'admin' is the existing top-level role (unchanged in DB).
// 'BUSINESS_MANAGER' and 'VIEWER' are new admin-tier sub-roles.
const ROLES = {
  ADMIN: 'admin',               // Full access — existing role, unchanged
  BUSINESS_MANAGER: 'BUSINESS_MANAGER', // Can create/edit businesses and manage coupons
  VIEWER: 'VIEWER'              // Read-only access
};

// ─── Permissions ──────────────────────────────────────────────────────────────
const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',

  // Users (app customers)
  VIEW_USERS: 'VIEW_USERS',
  CREATE_USER: 'CREATE_USER',
  EDIT_USER: 'EDIT_USER',
  DELETE_USER: 'DELETE_USER',

  // Admin Users (RBAC management)
  MANAGE_ROLES: 'MANAGE_ROLES',

  // Businesses
  VIEW_BUSINESS: 'VIEW_BUSINESS',
  CREATE_BUSINESS: 'CREATE_BUSINESS',
  EDIT_BUSINESS: 'EDIT_BUSINESS',
  DELETE_BUSINESS: 'DELETE_BUSINESS',

  // Reviews
  VIEW_REVIEWS: 'VIEW_REVIEWS',
  MANAGE_REVIEWS: 'MANAGE_REVIEWS',

  // Notifications
  SEND_NOTIFICATIONS: 'SEND_NOTIFICATIONS',

  // Categories
  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',

  // Orders
  VIEW_ORDERS: 'VIEW_ORDERS',

  // Coupons
  VIEW_COUPONS: 'VIEW_COUPONS',
  MANAGE_COUPONS: 'MANAGE_COUPONS',

  // Business Claims
  VIEW_CLAIMS: 'VIEW_CLAIMS',
  MANAGE_CLAIMS: 'MANAGE_CLAIMS',

  // Business Suspension
  SUSPEND_ACCOUNTS: 'SUSPEND_ACCOUNTS',

  // Subscriptions / Limits
  MANAGE_SUBSCRIPTIONS: 'MANAGE_SUBSCRIPTIONS',
};

// ─── Role → Default Permissions Map ──────────────────────────────────────────
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // admin gets ALL permissions

  [ROLES.BUSINESS_MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_BUSINESS,
    PERMISSIONS.CREATE_BUSINESS,
    PERMISSIONS.EDIT_BUSINESS,
    PERMISSIONS.VIEW_REVIEWS,
    PERMISSIONS.VIEW_COUPONS,
    PERMISSIONS.MANAGE_COUPONS,
    PERMISSIONS.VIEW_CLAIMS,
    PERMISSIONS.VIEW_ORDERS,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_BUSINESS,
    PERMISSIONS.VIEW_REVIEWS,
    PERMISSIONS.VIEW_COUPONS,
    PERMISSIONS.VIEW_CLAIMS,
    PERMISSIONS.VIEW_ORDERS,
  ],
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Returns ALL effective permissions for a user.
 *
 * Strategy:
 *  - If the user has explicit permissions stored (user.permissions.length > 0),
 *    those are used as the EXACT set — admin has full control over what was set.
 *  - If no explicit permissions are stored AND role is 'admin' (with no adminRole),
 *    the user gets ALL permissions (legacy full admin).
 *  - Otherwise fall back to the role's default permission set.
 *
 * @param {string} role - 'admin', 'BUSINESS_MANAGER', or 'VIEWER'
 * @param {string[]} customPermissions - Explicitly stored permissions (the exact set)
 * @returns {string[]}
 */
const getEffectivePermissions = (role, customPermissions = []) => {
  // Explicit permissions set by admin → use as the authoritative set
  if (customPermissions && customPermissions.length > 0) {
    return [...new Set(customPermissions)];
  }
  // No explicit perms → fall back to role defaults
  return [...(ROLE_PERMISSIONS[role] || [])];
};

/**
 * Check if a user has a specific permission.
 * @param {object} user - MongoDB user document
 * @param {string} permission - Permission constant from PERMISSIONS
 * @returns {boolean}
 */
const userHasPermission = (user, permission) => {
  if (!user) return false;
  const effective = getEffectivePermissions(user.adminRole || user.role, user.permissions || []);
  return effective.includes(permission);
};

/**
 * Check if a user has ALL of the specified permissions.
 * @param {object} user
 * @param {string[]} permissions
 * @returns {boolean}
 */
const userHasAllPermissions = (user, permissions) => {
  return permissions.every(p => userHasPermission(user, p));
};

/**
 * Returns all admin-tier roles as an array.
 */
const getAdminRoles = () => Object.values(ROLES);

/**
 * Returns human-readable label for a role.
 */
const getRoleLabel = (role) => {
  const labels = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.BUSINESS_MANAGER]: 'Business Manager',
    [ROLES.VIEWER]: 'Viewer',
  };
  return labels[role] || role;
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getEffectivePermissions,
  userHasPermission,
  userHasAllPermissions,
  getAdminRoles,
  getRoleLabel,
};
