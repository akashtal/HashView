const express = require('express');
const router = express.Router();
const {
  getCurrentUserPermissions,
  getAllAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleAdminUserStatus,
  updateUserPermissions,
  deleteAdminUser,
  getRolesAndPermissions,
} = require('../controllers/rbac.controller');
const { protect, requireAdminTier, checkPermission } = require('../middleware/auth.middleware');
const { PERMISSIONS } = require('../constants/rbac');

// All RBAC routes require the user to be authenticated AND be an admin-tier user
router.use(protect, requireAdminTier);

// ── Current user info (any admin can call this) ──────────────────────────────
router.get('/me', getCurrentUserPermissions);

// ── Roles & permissions meta (any admin can call this) ───────────────────────
router.get('/roles', getRolesAndPermissions);

// ── Admin user management (requires MANAGE_ROLES permission) ─────────────────
router.get('/users', checkPermission(PERMISSIONS.MANAGE_ROLES), getAllAdminUsers);
router.post('/users', checkPermission(PERMISSIONS.MANAGE_ROLES), createAdminUser);
router.put('/users/:id', checkPermission(PERMISSIONS.MANAGE_ROLES), updateAdminUser);
router.put('/users/:id/status', checkPermission(PERMISSIONS.MANAGE_ROLES), toggleAdminUserStatus);
router.put('/users/:id/permissions', checkPermission(PERMISSIONS.MANAGE_ROLES), updateUserPermissions);
router.delete('/users/:id', checkPermission(PERMISSIONS.MANAGE_ROLES), deleteAdminUser);

module.exports = router;
