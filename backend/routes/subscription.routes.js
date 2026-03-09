const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
    getStatus,
    createCheckoutSession,
    createPortalSession,
    handleWebhook,
} = require('../controllers/subscription.controller');

// ─── Stripe Webhook ────────────────────────────────────────────────────────────
// Raw body parsing is applied in server.js BEFORE express.json().
// No auth here — Stripe's HMAC signature IS the authentication.
router.post('/webhook', handleWebhook);

// ─── Fix 2: Rate limiters ─────────────────────────────────────────────────────
// Prevents abuse (hammering checkout/portal to inflate Stripe API costs or
// create duplicate customers). Status check has a softer limit.

const statusLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 30,                      // 30 status checks per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please wait a moment.' },
});

const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,    // 15 minutes
    max: 5,                       // 5 checkout attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many checkout attempts. Please try again later.' },
});

const portalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,     // 5 minutes
    max: 10,                      // 10 portal opens per 5 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many portal requests. Please try again later.' },
});

// ─── Protected routes (business owners only) ──────────────────────────────────
router.use(protect);
router.use(authorize('business'));

// GET /api/subscription/status
router.get('/status', statusLimiter, getStatus);

// POST /api/subscription/create-checkout-session
router.post('/create-checkout-session', checkoutLimiter, createCheckoutSession);

// POST /api/subscription/create-portal-session
router.post('/create-portal-session', portalLimiter, createPortalSession);

module.exports = router;
