const express = require('express');
const router = express.Router({ mergeParams: true }); // to access businessId
const { protect, authorize } = require('../middleware/auth.middleware');
const taxController = require('../controllers/tax.controller');

// Scaffolding for Phase 1
router.get('/', taxController.getRules);
router.post('/tax', protect, authorize('business', 'admin'), taxController.createTaxRule);
router.post('/charge', protect, authorize('business', 'admin'), taxController.createChargeRule);

module.exports = router;
