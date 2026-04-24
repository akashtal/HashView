const BusinessUpdate  = require('../models/BusinessUpdate.model');
const Business        = require('../models/Business.model');
const BusinessOwner   = require('../models/BusinessOwner.model');
const User            = require('../models/User.model');
const { sendBulkNotifications } = require('../utils/notification');
const { getActivePushTokenEntries } = require('../utils/pushTokenRegistry');
const logger          = require('../utils/logger');

const buildShortNotificationBody = ({ type, title, description, discountType, discountValue }) => {
  const baseText = (description || title || '').trim();
  const shortText = baseText.length > 120 ? `${baseText.slice(0, 117)}...` : baseText;

  if (type === 'offer' && discountValue > 0) {
    const discount = discountType === 'percentage'
      ? `${discountValue}% OFF`
      : `£${discountValue} OFF`;
    return shortText ? `${discount} - ${shortText}` : discount;
  }

  return shortText || 'Tap to see the latest update.';
};

// @desc    Get all updates/offers for a business
// @route   GET /api/business/:businessId/updates
// @access  Public
exports.getBusinessUpdates = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type } = req.query; // Filter by type: 'offer', 'update', 'announcement'

    const query = {
      business: businessId,
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const updates = await BusinessUpdate.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: updates.length,
      updates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create update/offer (Business owner only)
// @route   POST /api/business/:businessId/updates
// @access  Private (Business owner)
exports.createBusinessUpdate = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type, title, description, image, discountType, discountValue, validUntil } = req.body;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add updates for this business'
      });
    }

    // ── Free trial / Pro gate ─────────────────────────────────────────────────
    // Only enforced when SUBSCRIPTION_ENABLED=true in .env
    const subscriptionEnabled = process.env.SUBSCRIPTION_ENABLED !== 'false';

    let owner = null;

    if (subscriptionEnabled) {
      // Use business.owner (direct FK) — reliable, not dependent on businesses[] array
      owner = await BusinessOwner
        .findById(business.owner)
        .select('subscription pushNotifications freeTrial isPro');

      if (!owner) {
        return res.status(404).json({ success: false, message: 'Business owner not found' });
      }

      const canPost = owner.isPro || owner.hasFreeTrial;
      if (!canPost) {
        const max = owner.freeTrial?.maxFreeUpdates || 25;
        return res.status(403).json({
          success: false,
          message: `You have used all ${max} free updates. Subscribe to HashView Pro to continue posting offers and updates.`,
          trialExhausted: true,
          freeTrial: {
            updatesUsed: owner.freeTrial?.updatesUsed || 0,
            maxFreeUpdates: max,
            remaining: 0
          }
        });
      }
    }

    const update = await BusinessUpdate.create({
      business: businessId,
      type,
      title,
      description,
      image,
      discountType,
      discountValue,
      validUntil,
      createdBy: req.user.id
    });

    // ── Increment free trial counter (only when subscriptions enabled + non-Pro) ──
    if (subscriptionEnabled && owner && !owner.isPro) {
      await BusinessOwner.findByIdAndUpdate(owner._id, {
        $inc: { 'freeTrial.updatesUsed': 1 }
      });
      logger.info(`[Updates] Free trial usage: ${(owner.freeTrial?.updatesUsed || 0) + 1}/${owner.freeTrial?.maxFreeUpdates || 25} for owner ${owner._id}`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ── PUSH NOTIFICATION DISPATCH ───────────────────────────────────────────
    // Sends push notifications to users who REVIEWED or FAVOURITED this business.
    // When SUBSCRIPTION_ENABLED=false → always sends.
    // When SUBSCRIPTION_ENABLED=true  → only if owner isPro or hasFreeTrial.
    // ══════════════════════════════════════════════════════════════════════════
    const shouldNotify = !subscriptionEnabled || (owner && (owner.isPro || owner.hasFreeTrial));

    if (shouldNotify) {
      // Load owner if not already loaded (happens when subscriptions are disabled)
      if (!owner) {
        owner = await BusinessOwner
          .findById(business.owner)
          .select('pushNotifications');
      }

      if (!owner) {
        logger.warn(`[Updates] ⚠️ Push skipped — could not find owner for business ${businessId}`);
      } else {
        // Fire-and-forget: don't block the API response
        (async () => {
          try {
            const Review = require('../models/Review.model');

            // ── Step 1: Get ALL reviewer user IDs for this business ──────────
            const reviewerUserIds = await Review
              .find({ business: businessId })
              .distinct('user');

            logger.info(`[Updates] 🔍 Found ${reviewerUserIds.length} reviewer IDs for business ${businessId}`);

            // ── Step 2: Get ALL favouriter user docs ─────────────────────────
            const favouriterDocs = await User
              .find({
                favoritePlaces: businessId,
                status: 'active'
              })
              .select('_id pushToken pushTokens email');

            // ── Step 3: Get reviewer user docs ───────────────────────────────
            // Guard against empty array — MongoDB $in:[] returns all docs!
            const reviewerDocs = reviewerUserIds.length > 0
              ? await User
                  .find({
                    _id: { $in: reviewerUserIds },
                    status: 'active'
                  })
                  .select('_id pushToken pushTokens email')
              : [];

            logger.info(`[Updates] 🔍 Reviewer users found in DB: ${reviewerDocs.length} (from ${reviewerUserIds.length} review IDs)`);

            // ── Step 4: Merge & deduplicate by _id ──────────────────────────
            const seen = new Set();
            const allTargetUsers = [...reviewerDocs, ...favouriterDocs].filter(u => {
              const id = u._id.toString();
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });

            // ── Step 5: Diagnostic logging ───────────────────────────────────
            const withoutToken = allTargetUsers.filter(u => getActivePushTokenEntries(u, 'User').length === 0);

            logger.info(
              `[Updates] 📊 Push breakdown for "${title}" (${business.name}):` +
              ` Reviewers: ${reviewerDocs.length}` +
              ` | Favouriters: ${favouriterDocs.length}` +
              ` | Unique targets: ${allTargetUsers.length}` +
              ` | Without token (skipping): ${withoutToken.length}`
            );

            if (allTargetUsers.length === 0) {
              logger.info(`[Updates] No eligible users to notify — skipping push`);
              return;
            }

            // ── Step 6: Build notification payload ───────────────────────────
            const notificationTitle = type === 'offer'
              ? `New Offer from ${business.name}`
              : `New Update from ${business.name}`;
            const notificationBody = buildShortNotificationBody({
              type,
              title,
              description,
              discountType,
              discountValue
            });

            // ── Step 7: Send ALL unique target IDs to sendBulkNotifications ──
            // Pass ALL user IDs (not pre-filtered by token).
            // sendBulkNotifications internally handles token validation & filtering.
            const allTargetIds = allTargetUsers.map(u => u._id);
            const { sentIds, failed } = await sendBulkNotifications(
              allTargetIds,
              notificationTitle,
              notificationBody,
              {
                type: 'BUSINESS_UPDATE',
                businessId: businessId.toString(),
                updateId: update._id.toString(),
                updateType: type,
                screen: 'BusinessDetail',
                targetTab: 'updates'
              }
            );

            // ── Step 8: Persist results ──────────────────────────────────────
            if (sentIds.length > 0) {
              update.notifiedUsers      = sentIds;
              update.notificationSentAt = new Date();
              await update.save();

              // Track on owner
              const alreadyReachedIds = (owner.pushNotifications?.notifiedUserIds || []).map(id => id.toString());
              const newIds = sentIds.filter(id => !alreadyReachedIds.includes(id.toString()));
              if (newIds.length > 0) {
                await BusinessOwner.findByIdAndUpdate(owner._id, {
                  $push: { 'pushNotifications.notifiedUserIds': { $each: newIds } },
                  $inc:  { 'pushNotifications.totalSent': sentIds.length }
                });
              }

              logger.info(`[Updates] ✅ Push sent for "${title}" by ${business.name} → ${sentIds.length} delivered (reviewers + favouriters), ${failed} skipped/failed`);
            } else {
              logger.info(`[Updates] ⚠️ Push attempted but 0 delivered for "${title}" (${business.name}) — ${failed} failed. Check if users have push tokens registered.`);
            }
          } catch (notifErr) {
            // Notification failure must NEVER block the create response
            logger.error(`[Updates] ❌ Push notification error for "${title}":`, notifErr.message);
          }
        })();
      }
    } else {
      logger.info(`[Updates] Skipping push — owner has no Pro or free trial (businessId: ${businessId})`);
    }
    // ── End push dispatch ────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      message: 'Update created successfully',
      update
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business update/offer
// @route   PUT /api/business/updates/:updateId
// @access  Private (Business owner)
exports.updateBusinessUpdate = async (req, res, next) => {
  try {
    let update = await BusinessUpdate.findById(req.params.updateId);

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    // Verify ownership
    const business = await Business.findById(update.business);
    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { title, description, image, discountType, discountValue, validUntil, isActive } = req.body;

    if (title) update.title = title;
    if (description) update.description = description;
    if (image) update.image = image;
    if (discountType) update.discountType = discountType;
    if (discountValue !== undefined) update.discountValue = discountValue;
    if (validUntil) update.validUntil = validUntil;
    if (isActive !== undefined) update.isActive = isActive;

    await update.save();

    res.status(200).json({
      success: true,
      message: 'Update updated successfully',
      update
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete business update/offer
// @route   DELETE /api/business/updates/:updateId
// @access  Private (Business owner)\
exports.deleteBusinessUpdate = async (req, res, next) => {
  try {
    const update = await BusinessUpdate.findById(req.params.updateId);

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    // Verify ownership
    const business = await Business.findById(update.business);
    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await update.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Update deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
