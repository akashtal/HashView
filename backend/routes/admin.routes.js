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
  promoteUserToBusiness
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are admin-only
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/businesses', getAllBusinesses);
router.get('/businesses/:id', getBusinessById);
router.post('/businesses', createBusiness);
router.put('/businesses/:id', updateBusiness);
router.put('/businesses/:id/radius', updateBusinessRadius);
router.put('/businesses/:id/kyc', updateBusinessKYC);
router.post('/businesses/:id/generate-qr', generateBusinessQRCode);
router.post('/users/:id/promote-to-business', promoteUserToBusiness);
router.put('/users/:id/status', updateUserStatus);
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/status', updateReviewStatus);
router.post('/notifications/send', sendNotification);
router.delete('/users/:id', deleteUser);
router.delete('/businesses/:id', deleteBusiness);

// Suspension routes
router.post('/users/:id/suspend', suspendUser);
router.post('/businesses/:id/suspend', suspendBusiness);
router.post('/suspended/:id/unsuspend', unsuspendAccount);
router.get('/suspended', getAllSuspendedAccounts);

// Coupon Management routes
router.get('/coupons', getAllCoupons);
router.put('/coupons/:id/status', toggleCouponStatus);
router.delete('/coupons/:id', deleteCoupon);

// Business Owner notification limit & free trial limit (Admin control)
router.get('/business-owners', getBusinessOwners);
router.put('/business-owners/:ownerId/notification-limit', setOwnerNotificationLimit);
router.put('/business-owners/:ownerId/free-trial-limit', setOwnerFreeTrialLimit);

module.exports = router;

