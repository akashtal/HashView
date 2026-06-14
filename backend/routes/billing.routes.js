const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth.middleware');
const billingController = require('../controllers/billing.controller');

// Scaffolding for Phase 1
router.get('/rules/:businessId', billingController.getBillingRules);
router.post('/preview', billingController.previewBill);
router.get('/history', protect, authorize('business', 'admin'), billingController.getBillingHistory);

module.exports = router;
