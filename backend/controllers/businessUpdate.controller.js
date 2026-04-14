const BusinessUpdate  = require('../models/BusinessUpdate.model');
const Business        = require('../models/Business.model');
const BusinessOwner   = require('../models/BusinessOwner.model');
const User            = require('../models/User.model');
const { sendBulkNotifications } = require('../utils/notification');
const logger          = require('../utils/logger');

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
      owner = await BusinessOwner
        .findOne({ businesses: businessId })
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

    // ── Push notification dispatch ──────────────────────────────────────────
    // When subscriptions are disabled → always send push notifications.
    // When enabled → only Pro or free trial users get push.
    const shouldNotify = !subscriptionEnabled || (owner && (owner.isPro || owner.hasFreeTrial));

    if (shouldNotify) {
      // ── Use business.owner directly — reliable, no businesses-array dependency ──
      if (!owner) {
        owner = await BusinessOwner
          .findById(business.owner)
          .select('pushNotifications');
      }

      if (!owner) {
        logger.warn(`[Updates] Push skipped — could not find owner for business ${businessId}`);
      } else {
        try {
          const maxReach = owner.pushNotifications?.maxReach ?? 100;
          const alreadyReachedIds = (owner.pushNotifications?.notifiedUserIds || []).map(id => id.toString());

          // Build notification text
          let notificationTitle = `📢 ${business.name}`;
          let notificationBody  = title;
          if (type === 'offer' && discountValue > 0) {
            const disc = discountType === 'percentage' ? `${discountValue}% OFF` : `£${discountValue} OFF`;
            notificationTitle = `🎁 ${business.name} — New Offer!`;
            notificationBody  = `${disc} · ${title}`;
          }

          // ── Target: users who reviewed OR favourited this specific business ──
          const Review = require('../models/Review.model');

          // ALL reviewer IDs (regardless of push token)
          const allReviewerIds = await Review
            .find({ business: businessId })
            .distinct('user');

          // ALL favouriter IDs (regardless of push token)
          const allFavouriters = await User
            .find({ favoritePlaces: businessId })
            .select('_id pushToken email');

          // Get reviewer user docs
          const allReviewerDocs = await User
            .find({ _id: { $in: allReviewerIds } })
            .select('_id pushToken email');

          // Merge & deduplicate
          const seenAll = new Set();
          const allTargets = [...allFavouriters, ...allReviewerDocs].filter(u => {
            const id = u._id.toString();
            if (seenAll.has(id)) return false;
            seenAll.add(id);
            return true;
          });

          // Split: who has a push token vs who doesn't
          const withToken    = allTargets.filter(u => u.pushToken);
          const withoutToken = allTargets.filter(u => !u.pushToken);

          // Diagnostic log — shows exactly why only N people get notified
          logger.info(
            `[Updates] 📊 Push breakdown for "${title}" (business: ${business.name}):` +
            ` Total reviewers: ${allReviewerDocs.length}` +
            ` | Total favouriters: ${allFavouriters.length}` +
            ` | Unique targets: ${allTargets.length}` +
            ` | With push token: ${withToken.length}` +
            ` | Without push token (can't notify): ${withoutToken.length}`
          );
          if (withoutToken.length > 0) {
            logger.info(`[Updates] ⚠️  Users without push token: ${withoutToken.map(u => u.email || u._id).join(', ')}`);
          }

          const eligibleUsers = withToken;

          if (eligibleUsers.length === 0) {
            logger.info(`[Updates] No users have reviewed or favourited this business yet — no push sent`);
          } else {
            // Prioritise fresh users (never notified by this owner), then already-notified up to maxReach
            const freshUsers  = eligibleUsers.filter(u => !alreadyReachedIds.includes(u._id.toString()));
            const reachedUsers = eligibleUsers.filter(u => alreadyReachedIds.includes(u._id.toString()));
            const poolUsers = freshUsers.length >= maxReach
              ? freshUsers.slice(0, maxReach)
              : [...freshUsers, ...reachedUsers.slice(0, maxReach - freshUsers.length)];

            const userIds = poolUsers.map(u => u._id);
            const { sentIds } = await sendBulkNotifications(
              userIds,
              notificationTitle,
              notificationBody,
              {
                type: 'business_update',
                businessId: businessId.toString(),
                updateId: update._id.toString(),
                screen: 'BusinessDetail'
              }
            );

            if (sentIds.length > 0) {
              update.notifiedUsers     = sentIds;
              update.notificationSentAt = new Date();
              await update.save();

              const newIds = sentIds.filter(id => !alreadyReachedIds.includes(id.toString()));
              await BusinessOwner.findByIdAndUpdate(owner._id, {
                $push: { 'pushNotifications.notifiedUserIds': { $each: newIds } },
                $inc:  { 'pushNotifications.totalSent': sentIds.length }
              });

              logger.info(`[Updates] ✅ Push sent for "${title}" by ${business.name} → ${sentIds.length} users`);
            } else {
              logger.info(`[Updates] Push attempted but 0 delivered for "${title}" (${business.name})`);
            }
          }
        } catch (notifErr) {
          // Notification failure must never block the create response
          logger.error('[Updates] Push notification error:', notifErr.message);
        }
      }
    } else {
      logger.info(`[Updates] Skipping push — owner has no Pro or free trial (businessId: ${businessId})`);
    }
    // ── End push dispatch ───────────────────────────────────────────────────

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
// @access  Private (Business owner)
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
