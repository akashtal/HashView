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

    // ── Push notification dispatch ──────────────────────────────────────────
    // Only Pro subscribers may send push notifications
    const owner = await BusinessOwner
      .findOne({ businesses: businessId })
      .select('subscription pushNotifications isPro');

    if (owner && owner.isPro) {
      try {
        const maxReach = owner.pushNotifications?.maxReach ?? 100;
        const alreadyReachedIds = owner.pushNotifications?.notifiedUserIds?.map(id => id.toString()) || [];

        // Build notification text
        let notificationTitle = `📢 ${business.name}`;
        let notificationBody  = title;
        if (type === 'offer' && discountValue > 0) {
          const disc = discountType === 'percentage' ? `${discountValue}% OFF` : `£${discountValue} OFF`;
          notificationTitle = `🎁 ${business.name} — New Offer!`;
          notificationBody  = `${disc} · ${title}`;
        }

        // Query ALL users with a push token — prioritise those never reached by this owner
        const User = require('../models/User.model');
        const allUsers = await User.find({ pushToken: { $exists: true, $ne: null } }).select('_id pushToken');

        // Split: fresh users (never notified by this owner) first, then already-notified
        const freshUsers = allUsers.filter(u => !alreadyReachedIds.includes(u._id.toString()));
        const poolUsers  = freshUsers.length >= maxReach
          ? freshUsers.slice(0, maxReach)
          : [
              ...freshUsers,
              ...allUsers
                .filter(u => alreadyReachedIds.includes(u._id.toString()))
                .slice(0, maxReach - freshUsers.length)
            ];

        if (poolUsers.length > 0) {
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

          // Track per-update and per-owner, then persist
          if (sentIds.length > 0) {
            update.notifiedUsers  = sentIds;
            update.notificationSentAt = new Date();
            await update.save();

            // Append new recipients to owner's cumulative list (avoid duplicates)
            const newIds = sentIds.filter(id => !alreadyReachedIds.includes(id.toString()));
            await BusinessOwner.findByIdAndUpdate(owner._id, {
              $push: { 'pushNotifications.notifiedUserIds': { $each: newIds } },
              $inc:  { 'pushNotifications.totalSent': sentIds.length }
            });

            logger.info(`[Updates] Push sent for "${title}" by ${business.name} → ${sentIds.length} users`);
          }
        } else {
          logger.info(`[Updates] No eligible users to notify for "${title}" (${business.name})`);
        }
      } catch (notifErr) {
        // Notification failure must never block the create response
        logger.error('[Updates] Push notification error:', notifErr.message);
      }
    } else if (owner && !owner.isPro) {
      logger.info(`[Updates] Skipping push — owner is not Pro (businessId: ${businessId})`);
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
