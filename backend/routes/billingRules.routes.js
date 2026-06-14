const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');


const {
  createTaxRule,
  getTaxRules,
  updateTaxRule,
  toggleTaxRule,
  deleteTaxRule,
  createChargeRule,
  getChargeRules,
  updateChargeRule,
  toggleChargeRule,
  deleteChargeRule,
  getActiveRules
} = require('../controllers/billingRules.controller');

// Public/Customer Route (used for bill preview logic)
// Already handled in phase 4 via GET /api/billing/rules/:businessId, but we'll map it here for completeness
router.get('/business/:businessId/active', getActiveRules);

// ─── Tax Rules Routes ───────────────────────────────────────
router.post('/tax', protect, authorize('business', 'admin'), createTaxRule);
router.get('/tax/business/:businessId', protect, getTaxRules);
router.put('/tax/:id', protect, authorize('business', 'admin'), updateTaxRule);
router.patch('/tax/:id/toggle', protect, authorize('business', 'admin'), toggleTaxRule);
router.delete('/tax/:id', protect, authorize('business', 'admin'), deleteTaxRule);

// ─── Charge Rules Routes ────────────────────────────────────
router.post('/charge', protect, authorize('business', 'admin'), createChargeRule);
router.get('/charge/business/:businessId', protect, getChargeRules);
router.put('/charge/:id', protect, authorize('business', 'admin'), updateChargeRule);
router.patch('/charge/:id/toggle', protect, authorize('business', 'admin'), toggleChargeRule);
router.delete('/charge/:id', protect, authorize('business', 'admin'), deleteChargeRule);

module.exports = router;
