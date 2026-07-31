/**
 * Referral Routes
 *
 * GET  /api/referral/me         → Get my referral code + link  [auth required]
 * POST /api/referral/validate   → Check if a code is valid     [public]
 * POST /api/referral/generate   → Regenerate my code           [auth required]
 */

const express = require('express');
const router  = express.Router();

const {
  getMyReferral,
  validateCode,
  regenerateCode
} = require('../controllers/referral.controller');

const { protect } = require('../middleware/auth.middleware');

// Public — used by registration screen to validate a code before sign-up
router.post('/validate', validateCode);

// Protected — requires a logged-in user
router.get('/me',           protect, getMyReferral);
router.post('/generate',    protect, regenerateCode);

module.exports = router;
