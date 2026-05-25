const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getMenuItems,
  getMenuItemsFlat,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  reorderMenuItems,
  getMenuStats
} = require('../controllers/menuItem.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Memory storage so req.file.buffer is populated for Cloudinary stream uploads
const menuImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowedMime = /jpeg|jpg|png|webp/i;
    const allowedExt = /\.(jpeg|jpg|png|webp)$/i;
    
    const isMimeAllowed = allowedMime.test(file.mimetype);
    const isExtAllowed = allowedExt.test(file.originalname);
    
    if (isMimeAllowed || isExtAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed for menu items.'), false);
    }
  }
});

// ─── Public Routes ────────────────────────────────────────────────────────────

// Get all active items for a business, grouped by category (user-facing menu tab)
router.get('/business/:businessId', getMenuItems);

// Get flat array of all active items — used internally by the AI Gateway search
router.get('/business/:businessId/flat', getMenuItemsFlat);

// ─── Protected Routes (business owner or admin) ───────────────────────────────

// Quick dashboard stats
router.get('/business/:businessId/stats', protect, authorize('business', 'admin'), getMenuStats);

// Create a new item (with optional image upload)
router.post(
  '/',
  protect,
  authorize('business', 'admin'),
  menuImageUpload.single('image'),
  createMenuItem
);

// Update an item (with optional image replacement)
router.put(
  '/:id',
  protect,
  authorize('business', 'admin'),
  menuImageUpload.single('image'),
  updateMenuItem
);

// Delete an item (also removes Cloudinary image)
router.delete('/:id', protect, authorize('business', 'admin'), deleteMenuItem);

// Toggle availability (quick on/off from list view)
router.patch('/:id/toggle', protect, authorize('business', 'admin'), toggleAvailability);

// Batch reorder (drag-to-reorder in management UI)
router.put('/reorder/batch', protect, authorize('business', 'admin'), reorderMenuItems);

module.exports = router;
