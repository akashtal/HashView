/**
 * Referral Controller
 *
 * Handles all referral business logic:
 *  - Code generation (unique, human-readable: NAME + 4-digit suffix)
 *  - Getting a user's referral info
 *  - Validating a referral code (used during registration flow)
 *  - Applying a referral code at signup (called from auth.controller)
 *
 * The base invite URL is set via REFERRAL_BASE_URL env var.
 * Defaults to https://hashview.app/invite if not set.
 */

const User     = require('../models/User.model');
const Referral = require('../models/Referral.model');
const logger   = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = process.env.REFERRAL_BASE_URL || 'https://hashview.app/invite';

/**
 * Generate a referral code from the user's name + 4 random digits.
 * e.g.  "Akash Talwar"  →  "AKASH9274"
 * Strips non-alpha chars, takes first 8 letters, appends 4-digit random suffix.
 * Retries up to 5 times if the generated code already exists.
 */
async function generateUniqueCode(name) {
  const namePrefix = (name || 'USER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')  // keep letters only
    .slice(0, 8);             // max 8 chars from the name

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000)); // 4 digits
    const code   = `${namePrefix}${suffix}`;

    // Check uniqueness in DB
    const existing = await User.findOne({ 'referral.code': code }).select('_id').lean();
    if (!existing) return code;
  }

  // Fallback: timestamp-based code (virtually collision-proof)
  return `${namePrefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Ensure a user has a referral code + link. Generates them if missing.
 * Returns the updated user document.
 */
async function ensureReferralCode(user) {
  if (user.referral?.code) return user;

  const code = await generateUniqueCode(user.name);
  const link = `${BASE_URL}/${code}`;

  user.referral = { ...user.referral, code, link };
  await user.save();

  logger.info(`[Referral] Generated code ${code} for user ${user._id}`);
  return user;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/referral/me
 * Returns the authenticated user's referral code and link.
 * Generates them on first call if they don't yet exist.
 */
exports.getMyReferral = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user = await ensureReferralCode(user);

    return res.json({
      success: true,
      referral: {
        code: user.referral.code,
        link: user.referral.link,
        invitedBy: user.referral.invitedBy || null,
        invitedAt: user.referral.invitedAt || null
      }
    });
  } catch (err) {
    logger.error('[Referral] getMyReferral error:', err.message);
    next(err);
  }
};

/**
 * POST /api/referral/validate
 * Body: { code }
 * Public — checks if a referral code exists and returns the referrer's first name.
 * Used by the registration screen to give immediate feedback.
 */
exports.validateCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Referral code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();

    const referrer = await User.findOne({ 'referral.code': normalizedCode })
      .select('name referral.code')
      .lean();

    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Invalid referral code', valid: false });
    }

    return res.json({
      success: true,
      valid: true,
      referrerName: referrer.name.split(' ')[0] // Return first name only for privacy
    });
  } catch (err) {
    logger.error('[Referral] validateCode error:', err.message);
    next(err);
  }
};

/**
 * POST /api/referral/generate
 * Protected — regenerate the authenticated user's referral code.
 * Useful if a user wants a fresh code (rare but possible).
 */
exports.regenerateCode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const code = await generateUniqueCode(user.name);
    const link = `${BASE_URL}/${code}`;

    user.referral = { ...user.referral?.toObject?.() || {}, code, link };
    await user.save();

    logger.info(`[Referral] Regenerated code ${code} for user ${user._id}`);

    return res.json({
      success: true,
      referral: { code, link }
    });
  } catch (err) {
    logger.error('[Referral] regenerateCode error:', err.message);
    next(err);
  }
};

/**
 * applyReferralCode (not a route — called internally from auth.controller.register)
 *
 * @param {ObjectId} newUserId   - The newly created user's ID
 * @param {string}   code        - The referral code they entered
 * @returns {boolean}            - true if successfully applied
 */
exports.applyReferralCode = async (newUserId, code) => {
  try {
    if (!code) return false;

    const normalizedCode = String(code).trim().toUpperCase();

    const referrer = await User.findOne({ 'referral.code': normalizedCode }).select('_id').lean();
    if (!referrer) {
      logger.warn(`[Referral] Code ${normalizedCode} not found — skipping apply`);
      return false;
    }

    // Prevent self-referral
    if (referrer._id.toString() === newUserId.toString()) {
      logger.warn(`[Referral] Self-referral attempt blocked for user ${newUserId}`);
      return false;
    }

    // Update the new user's referral.invitedBy
    await User.findByIdAndUpdate(newUserId, {
      'referral.invitedBy': referrer._id,
      'referral.invitedAt': new Date()
    });

    // Create audit record
    await Referral.create({
      referrer:    referrer._id,
      referee:     newUserId,
      code:        normalizedCode,
      status:      'completed',
      completedAt: new Date()
    });

    logger.info(`[Referral] Applied code ${normalizedCode}: ${referrer._id} → ${newUserId}`);
    return true;
  } catch (err) {
    // Non-fatal — don't break registration if referral tracking fails
    logger.error('[Referral] applyReferralCode error (non-fatal):', err.message);
    return false;
  }
};

/**
 * generateCodeForNewUser (called internally from auth.controller.register)
 * Silently generates and saves a referral code for a brand-new user.
 *
 * @param {User} user  - Mongoose User document
 */
exports.generateCodeForNewUser = async (user) => {
  try {
    await ensureReferralCode(user);
  } catch (err) {
    // Non-fatal — don't break registration
    logger.error('[Referral] generateCodeForNewUser error (non-fatal):', err.message);
  }
};
