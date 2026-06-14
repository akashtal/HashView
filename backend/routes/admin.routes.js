const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  getAllBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  updateBusinessRadius,
  updateBusinessKYC,
  updateUserStatus,
  getAllReviews,
  updateReviewStatus,
  getReviewAnalytics,
  sendNotification,
  deleteUser,
  deleteBusiness,
  suspendUser,
  suspendBusiness,
  unsuspendAccount,
  getAllSuspendedAccounts,
  generateBusinessQRCode,
  getAllCoupons,
  toggleCouponStatus,
  deleteCoupon,
  getBusinessOwners,
  setOwnerNotificationLimit,
  setOwnerFreeTrialLimit,
  promoteUserToBusiness,
  getBackupStatus,
  triggerBackup,
  getAllOrders,
  getSuspiciousOrders
} = require('../controllers/admin.controller');
const { protect, requireAdminTier, checkPermission } = require('../middleware/auth.middleware');
const { PERMISSIONS } = require('../constants/rbac');

// All admin routes require authentication and admin-tier role
router.use(protect, requireAdminTier);

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_DASHBOARD), getDashboardStats);

// ── Users (app customers) ─────────────────────────────────────────────────────
router.get('/users', checkPermission(PERMISSIONS.VIEW_USERS), getAllUsers);
router.put('/users/:id/status', checkPermission(PERMISSIONS.EDIT_USER), updateUserStatus);
router.post('/users/:id/suspend', checkPermission(PERMISSIONS.SUSPEND_ACCOUNTS), suspendUser);
router.post('/users/:id/promote-to-business', checkPermission(PERMISSIONS.EDIT_USER), promoteUserToBusiness);
router.delete('/users/:id', checkPermission(PERMISSIONS.DELETE_USER), deleteUser);

// ── Businesses ────────────────────────────────────────────────────────────────
router.get('/businesses', checkPermission(PERMISSIONS.VIEW_BUSINESS), getAllBusinesses);
router.get('/businesses/:id', checkPermission(PERMISSIONS.VIEW_BUSINESS), getBusinessById);
router.post('/businesses', checkPermission(PERMISSIONS.CREATE_BUSINESS), createBusiness);
router.put('/businesses/:id', checkPermission(PERMISSIONS.EDIT_BUSINESS), updateBusiness);
router.put('/businesses/:id/radius', checkPermission(PERMISSIONS.EDIT_BUSINESS), updateBusinessRadius);
router.put('/businesses/:id/kyc', checkPermission(PERMISSIONS.EDIT_BUSINESS), updateBusinessKYC);
router.post('/businesses/:id/generate-qr', checkPermission(PERMISSIONS.EDIT_BUSINESS), generateBusinessQRCode);
router.post('/businesses/:id/suspend', checkPermission(PERMISSIONS.SUSPEND_ACCOUNTS), suspendBusiness);
router.delete('/businesses/:id', checkPermission(PERMISSIONS.DELETE_BUSINESS), deleteBusiness);

// ── Reviews ───────────────────────────────────────────────────────────────────
// IMPORTANT: /analytics MUST be before /:id routes to avoid Express treating 'analytics' as an ID param
router.get('/reviews/analytics', checkPermission(PERMISSIONS.VIEW_REVIEWS), getReviewAnalytics);
router.get('/reviews', checkPermission(PERMISSIONS.VIEW_REVIEWS), getAllReviews);
router.put('/reviews/:id/status', checkPermission(PERMISSIONS.MANAGE_REVIEWS), updateReviewStatus);

// ── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', checkPermission(PERMISSIONS.VIEW_ORDERS), getAllOrders);
router.get('/orders/suspicious', checkPermission(PERMISSIONS.VIEW_ORDERS), getSuspiciousOrders);

// ── Notifications ─────────────────────────────────────────────────────────────
router.post('/notifications/send', checkPermission(PERMISSIONS.SEND_NOTIFICATIONS), sendNotification);

// ── Suspended accounts ────────────────────────────────────────────────────────
router.get('/suspended', checkPermission(PERMISSIONS.SUSPEND_ACCOUNTS), getAllSuspendedAccounts);
router.post('/suspended/:id/unsuspend', checkPermission(PERMISSIONS.SUSPEND_ACCOUNTS), unsuspendAccount);

// ── Coupons ───────────────────────────────────────────────────────────────────
router.get('/coupons', checkPermission(PERMISSIONS.VIEW_COUPONS), getAllCoupons);
router.put('/coupons/:id/status', checkPermission(PERMISSIONS.MANAGE_COUPONS), toggleCouponStatus);
router.delete('/coupons/:id', checkPermission(PERMISSIONS.MANAGE_COUPONS), deleteCoupon);

// ── Business Owners / Subscription limits ─────────────────────────────────────
router.get('/business-owners', checkPermission(PERMISSIONS.VIEW_BUSINESS), getBusinessOwners);
router.put('/business-owners/:ownerId/notification-limit', checkPermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), setOwnerNotificationLimit);
router.put('/business-owners/:ownerId/free-trial-limit', checkPermission(PERMISSIONS.MANAGE_SUBSCRIPTIONS), setOwnerFreeTrialLimit);

// ── System / Backups ──────────────────────────────────────────────────────────
router.get('/backup-status', checkPermission(PERMISSIONS.VIEW_DASHBOARD), getBackupStatus);
router.post('/backup', checkPermission(PERMISSIONS.VIEW_DASHBOARD), triggerBackup);

module.exports = router;
