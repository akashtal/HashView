const express = require('express');
const router = express.Router();
const {
  registerBusiness,
  uploadDocuments,
  getNearbyBusinesses,
  getAllActiveBusinesses,
  searchBusinesses,
  getBusiness,
  getBusinessDashboard,
  generateQRCode,
  updateBusiness,
  updateBusinessImages,
  getMyBusinesses,
  getBusinessByQRCode,
  updateTripAdvisorRating,
  // Business Claim
  claimBusiness,
  uploadClaimDocuments,
  sendClaimPhoneOtp,
  verifyClaimPhoneOtp,
  getBusinessClaims,
  reviewBusinessClaim,
  bulkUploadBusinesses
} = require('../controllers/business.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Public routes
router.get('/all', getAllActiveBusinesses);
router.get('/nearby', getNearbyBusinesses);
router.get('/search', searchBusinesses);
router.post('/qr/scan', getBusinessByQRCode);

// ⚠️  Admin claims must come BEFORE /:id to avoid route shadowing
router.get('/admin/claims', protect, authorize('admin'), getBusinessClaims);

router.get('/:id', getBusiness);

// Protected routes
router.post('/register', protect, authorize('business'), validate(schemas.createBusiness), registerBusiness);
router.post('/:id/documents', protect, authorize('business'), upload.fields([
  { name: 'ownerIdProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'foodSafetyCertificate', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 }
]), uploadDocuments);
router.get('/:id/dashboard', protect, getBusinessDashboard);
router.post('/:id/generate-qr', protect, authorize('business'), generateQRCode);
router.put('/:id', protect, authorize('business'), updateBusiness);
router.put('/:id/images', protect, authorize('business'), updateBusinessImages);
router.put('/:id/tripadvisor-rating', protect, authorize('business', 'admin'), updateTripAdvisorRating);
router.get('/my/businesses', protect, authorize('business'), getMyBusinesses);

const mult = require('multer');

// Configure multer for Excel uploads (memory storage for direct parsing)
const excelStorage = mult.memoryStorage();
const excelUpload = mult({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload only Excel files (.xlsx)'), false);
    }
  }
});

// ─── Claim document upload (memory storage → Cloudinary buffer) ───
const claimUpload = mult({
  storage: mult.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG or PDF files are allowed for identity documents.'), false);
  }
});

// Business Claim routes (any logged-in user)
router.post('/:id/claim', protect, claimBusiness);
router.post('/:id/claim/documents', protect, claimUpload.fields([
  { name: 'ownerIdProof', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), uploadClaimDocuments);
router.post('/:id/claim/send-phone-otp', protect, sendClaimPhoneOtp);
router.post('/:id/claim/verify-phone-otp', protect, verifyClaimPhoneOtp);

// Admin Claim management
router.put('/:id/claim/review', protect, authorize('admin'), reviewBusinessClaim);

// Business notifications
const { sendBusinessNotification } = require('../controllers/notification.controller');
router.post('/notifications/send', protect, authorize('business'), sendBusinessNotification);

// Bulk Upload (Admin only)
router.post('/bulk-upload', protect, authorize('admin'), excelUpload.single('file'), bulkUploadBusinesses);

module.exports = router;
