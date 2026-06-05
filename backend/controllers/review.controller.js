const Review = require('../models/Review.model');
const Business = require('../models/Business.model');
const Coupon = require('../models/Coupon.model');
const { isWithinGeofence } = require('../utils/geolocation');
const { generateCouponCode, calculateCouponExpiry } = require('../utils/coupon');
const { sendPushNotification } = require('../utils/notification');
const { generateCouponQRCode } = require('../utils/qrcode');
const logger = require('../utils/logger');
const { invalidateAndEmitTopReviewer } = require('./businessLive.controller');

// In-memory suspicious behavior log (in production, use MongoDB collection)
const suspiciousActivityLog = [];

// Helper function to log suspicious behavior
async function logSuspiciousBehavior(userId, eventType, metadata) {
  const logEntry = {
    userId,
    eventType,
    metadata,
    timestamp: new Date(),
    ipAddress: metadata.ipAddress || null
  };

  // Store in memory (in production, save to database)
  suspiciousActivityLog.push(logEntry);

  // Keep only last 1000 entries
  if (suspiciousActivityLog.length > 1000) {
    suspiciousActivityLog.shift();
  }

  // Log to file
  logger.warn(`🚨 Suspicious Activity: ${eventType}`, logEntry);

  // TODO: In production, save to SuspiciousActivity collection
  // await SuspiciousActivity.create(logEntry);

  return logEntry;
}

// @desc    Get suspicious activities (Admin only)
// @route   GET /api/reviews/admin/suspicious-activities
// @access  Private/Admin
exports.getSuspiciousActivities = async (req, res, next) => {
  try {
    // Return in-memory suspicious activity log
    const activities = suspiciousActivityLog
      .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
      .slice(0, 100); // Last 100 entries

    res.status(200).json({
      success: true,
      count: activities.length,
      total: suspiciousActivityLog.length,
      activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get flagged reviews (Admin only)
// @route   GET /api/reviews/admin/flagged
// @access  Private/Admin
exports.getFlaggedReviews = async (req, res, next) => {
  try {
    const flaggedReviews = await Review.find({
      $or: [
        { status: 'flagged' },
        { 'securityMetadata.isMockLocation': true },
        { 'securityMetadata.suspiciousActivitiesCount': { $gte: 3 } },
        { 'securityMetadata.locationAccuracy': { $gt: 50 } },
        { 'securityMetadata.motionDetected': false }
      ]
    })
      .populate('user', 'name email phoneNumber')
      .populate('business', 'name address')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: flaggedReviews.length,
      reviews: flaggedReviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear suspicious activities log (Admin only)
// @route   DELETE /api/reviews/admin/suspicious-activities
// @access  Private/Admin
exports.clearSuspiciousActivities = async (req, res, next) => {
  try {
    const count = suspiciousActivityLog.length;
    suspiciousActivityLog.length = 0; // Clear array

    logger.info(`🧹 Suspicious activities log cleared by admin (${count} entries removed)`);

    res.status(200).json({
      success: true,
      message: `Cleared ${count} suspicious activity entries`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    console.log('\n\n=== 🚨 INCOMING REVIEW PAYLOAD ===');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('===================================\n\n');

    const {
      business: businessId,
      rating,
      comment,
      emotion, // Add emotion field
      categoryRatings, // Add category ratings
      latitude,
      longitude,
      images,
      videos, // Videos array with URLs from Cloudinary
      // 🔒 COMPREHENSIVE SECURITY METADATA from frontend
      locationAccuracy,
      verificationTime,
      motionDetected,
      isMockLocation,
      locationHistoryCount,
      suspiciousActivities,
      deviceFingerprint,
      devicePlatform
    } = req.body;

    // Geofencing security validation
    console.log(`🔒 Review attempt - User: ${req.user.id}, Business: ${businessId}`);

    // Get business
    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This business is not active'
      });
    }

    // SECURITY CHECK #1: Rate Limiting - Max 5 reviews per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReviewCount = await Review.countDocuments({
      user: req.user.id,
      createdAt: { $gte: today }
    });

    if (todayReviewCount >= 5) {
      await logSuspiciousBehavior(req.user.id, 'RATE_LIMIT_EXCEEDED', {
        reviewCount: todayReviewCount,
        businessId: businessId
      });

      return res.status(429).json({
        success: false,
        message: 'Review limit reached. You can post maximum 5 reviews per day. This helps maintain review quality.'
      });
    }

    // SECURITY CHECK #2: Duplicate review check (same business, today)
    const existingReview = await Review.findOne({
      user: req.user.id,
      business: businessId,
      createdAt: { $gte: today }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this business today'
      });
    }

    // Frontend metadata removed - doing real validation on backend now!

    // Verify geofencing - user must be within business radius
    const businessLat = business.location.coordinates[1];
    const businessLon = business.location.coordinates[0];

    // Verify geofencing
    const withinGeofence = isWithinGeofence(
      latitude,
      longitude,
      businessLat,
      businessLon,
      business.radius
    );

    const { calculateDistance } = require('../utils/geolocation');
    const actualDistance = calculateDistance(latitude, longitude, businessLat, businessLon);

    if (!withinGeofence) {
      await logSuspiciousBehavior(req.user.id, 'GEOFENCE_VIOLATION', {
        businessId: businessId,
        distance: actualDistance,
        allowedRadius: business.radius
      });

      return res.status(403).json({
        success: false,
        message: `You must be within ${business.radius}m of the business to post a review. You are currently ${actualDistance.toFixed(0)}m away.`
      });
    }

    // 🔒 COMPREHENSIVE SECURITY VALIDATION

    // GPS Accuracy check
    if (locationAccuracy && locationAccuracy > 50) {
      await logSuspiciousBehavior(req.user.id, 'POOR_GPS_ACCURACY', {
        businessId: businessId,
        accuracy: locationAccuracy
      });

      return res.status(400).json({
        success: false,
        message: `GPS accuracy is too low (${Math.round(locationAccuracy)}m). Please improve your GPS signal and try again.`
      });
    }

    // Verification time check (informational)
    if (verificationTime !== undefined && verificationTime !== 30) {
      await logSuspiciousBehavior(req.user.id, 'VERIFICATION_TIME_MISMATCH', {
        businessId: businessId,
        verificationTime: verificationTime
      });
    }

    // Mock Location detection
    if (isMockLocation === true) {
      await logSuspiciousBehavior(req.user.id, 'MOCK_LOCATION_DETECTED', {
        businessId: businessId,
        devicePlatform: devicePlatform
      });

      return res.status(403).json({
        success: false,
        message: 'Mock/fake GPS location detected. Please disable any location spoofing apps and use your real GPS location.'
      });
    }

    // Location History check
    if (locationHistoryCount !== undefined && locationHistoryCount < 5) {
      await logSuspiciousBehavior(req.user.id, 'INSUFFICIENT_LOCATION_HISTORY', {
        businessId: businessId,
        locationHistoryCount: locationHistoryCount
      });
    }

    // Suspicious Activities check
    if (suspiciousActivities && suspiciousActivities.length > 0) {
      for (const activity of suspiciousActivities) {
        await logSuspiciousBehavior(req.user.id, `FRONTEND_${activity.type}`, {
          businessId: businessId,
          ...activity.metadata,
          timestamp: activity.timestamp
        });
      }

      if (suspiciousActivities.length >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Multiple security concerns detected. Your submission has been flagged for review by our team.'
        });
      }
    }

    // Device Fingerprint check
    if (deviceFingerprint) {
      const sameDeviceReviews = await Review.countDocuments({
        user: req.user.id,
        'securityMetadata.deviceFingerprint.deviceId': deviceFingerprint.deviceId,
        createdAt: { $gte: today }
      });

      if (sameDeviceReviews >= 3) {
        await logSuspiciousBehavior(req.user.id, 'MULTIPLE_DEVICE_REVIEWS', {
          businessId: businessId,
          deviceId: deviceFingerprint.deviceId,
          reviewCount: sameDeviceReviews
        });
      }
    }

    // Create review with comprehensive security metadata
    const review = await Review.create({
      user: req.user.id,
      business: businessId,
      rating,
      comment,
      emotion: emotion || null, // Add emotion field
      categoryRatings: categoryRatings || null, // Add category ratings
      geolocation: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      images: images || [],
      videos: videos || [],
      verified: true,
      // Store all security metadata for auditing
      securityMetadata: {
        locationAccuracy: locationAccuracy,
        verificationTime: verificationTime,
        motionDetected: motionDetected,
        isMockLocation: isMockLocation,
        locationHistoryCount: locationHistoryCount,
        suspiciousActivitiesCount: suspiciousActivities?.length || 0,
        deviceFingerprint: deviceFingerprint,
        devicePlatform: devicePlatform,
        actualDistance: actualDistance,
        businessRadius: business.radius,
        submittedAt: new Date()
      }
    });

    // Log successful review submission
    logger.info(`✅ Review created successfully`, {
      reviewId: review._id,
      userId: req.user.id,
      businessId: businessId,
      distance: actualDistance.toFixed(2),
      businessRadius: business.radius
    });

    // Update business rating
    const reviews = await Review.find({ business: businessId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    business.rating.average = avgRating;
    business.rating.count = reviews.length;
    business.reviewCount = reviews.length;
    business.lastReviewAt = new Date(); // ← stamp last review time for home screen cards
    await business.save();

    // Invalidate live top reviewer cache and trigger websocket update
    invalidateAndEmitTopReviewer(businessId);

    // ── SMART COUPON REWARD LOGIC ──────────────────────────────────────────
    // The review is already saved at this point. Everything below is reward
    // issuance — if any of it fails, we MUST still return 201 so the user
    // knows their review was accepted. Coupon failure is non-fatal.
    try {
      // 1. Fetch ALL active, non-expired coupon templates for the reviewed business
      const now = new Date();
      const allTemplates = await Coupon.find({
        business: businessId,
        type: 'business',
        isActive: true,
        $or: [{ validUntil: null }, { validUntil: { $gt: now } }]
      });

      // Filter out templates whose redemptionLimit has been fully reached (store scan limit)
      // usageCount = how many times a coupon was issued after reviews
      // redemptionCount = how many users actually scanned/redeemed at the store
      // We gate by redemptionLimit (physical store redemptions), NOT usageCount (issued count)
      const validTemplates = allTemplates.filter(t => {
        if (t.redemptionLimit !== null && t.redemptionLimit !== undefined) {
          return t.redemptionCount < t.redemptionLimit;
        }
        if (t.usageLimit !== null && t.usageLimit !== undefined) {
          return t.usageCount < t.usageLimit;
        }
        return true; // no limit set
      });

      // Pick a random template from the valid ones (so different coupons are offered)
      let couponTemplate = null;
      if (validTemplates.length > 0) {
        couponTemplate = validTemplates[Math.floor(Math.random() * validTemplates.length)];
        logger.info(`Picked template "${couponTemplate.title || couponTemplate.code}" (${couponTemplate._id}) from ${validTemplates.length} valid template(s) for business ${businessId}`);
      }

      // Track which business the coupon will belong to (own or nearby)
      let couponBusinessId = businessId;
      let couponBusinessName = business.name;
      let isNearbyCoupon = false;

      // 2. If this business has no valid template, find a nearby business (within 25 km) that does
      if (!couponTemplate) {
        logger.info(`No valid coupon template for business ${businessId} (${allTemplates.length} template(s) exist but all exhausted/expired). Searching nearby businesses...`);

        // Pre-fetch only business IDs that actually have active coupon templates
        // so $geoNear doesn't have to scan every active business nearby
        const activeCouponBizIds = await Coupon.distinct('business', {
          type: 'business',
          isActive: true,
          $or: [{ validUntil: null }, { validUntil: { $gt: now } }]
        });

        const NEARBY_RADIUS_METERS = 25000; // 25 km — increase here if needed

        const nearbyBusinesses = await Business.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [businessLon, businessLat] },
              distanceField: 'dist',
              maxDistance: NEARBY_RADIUS_METERS,
              spherical: true,
              query: { _id: { $in: activeCouponBizIds, $ne: business._id }, status: 'active' }
            }
          },
          { $limit: 20 }
        ]);

        for (const nb of nearbyBusinesses) {
          const nbTemplates = await Coupon.find({
            business: nb._id,
            type: 'business',
            isActive: true,
            $or: [{ validUntil: null }, { validUntil: { $gt: now } }]
          });

          const nbValid = nbTemplates.filter(t => {
            if (t.redemptionLimit !== null && t.redemptionLimit !== undefined) {
              return t.redemptionCount < t.redemptionLimit;
            }
            if (t.usageLimit !== null && t.usageLimit !== undefined) {
              return t.usageCount < t.usageLimit;
            }
            return true;
          });

          if (nbValid.length > 0) {
            couponTemplate = nbValid[Math.floor(Math.random() * nbValid.length)];
            couponBusinessId = nb._id;
            couponBusinessName = nb.name;
            isNearbyCoupon = true;
            logger.info(`Found nearby coupon template from business: ${nb.name} (${nb._id})`);
            break;
          }
        }
      }

      // 3. If still no template found → no coupon, return the review without one
      if (!couponTemplate) {
        logger.info(`No coupon template available (own or nearby) for review on business ${businessId}. Skipping coupon.`);

        try {
          const User = require('../models/User.model');
          const user = await User.findById(req.user.id).select('name');
          await sendPushNotification(
            business.owner,
            '⭐ New Review!',
            `${user.name} left a ${rating}-star review for ${business.name}`,
            {
              type: 'review',
              screen: 'BusinessDashboard',
              reviewId: review._id.toString(),
              businessId: businessId.toString()
            }
          );
        } catch (notifError) {
          console.error('❌ Failed to send review notification:', notifError);
        }

        return res.status(201).json({
          success: true,
          message: 'Review posted successfully',
          review
        });
      }

      // 5. Issue the coupon using exact template values
      const couponCode = generateCouponCode();

      // ── SAFE DATE SANITIZATION ───────────────────────────────────────────
      // Some older coupon templates may have a validUntil stored as a
      // non-Date value (e.g. string "null", empty string, or a malformed
      // date string written by a previous code path that passed raw req.body
      // directly to Mongoose). Calling new Date() on such a value produces
      // an Invalid Date object which then causes Mongoose to throw:
      //   "Cast to date failed for value ..."
      // at Coupon.create() — AFTER the review was already saved — making
      // the API return a 500 while the review exists with no coupon attached.
      // We guard against this by checking isNaN before using the parsed date.
      let couponExpiry = null;
      if (couponTemplate.validUntil) {
        const parsedExpiry = new Date(couponTemplate.validUntil);
        if (!isNaN(parsedExpiry.getTime())) {
          couponExpiry = parsedExpiry;
        } else {
          logger.warn(`⚠️ Coupon template ${couponTemplate._id} has invalid validUntil value: "${couponTemplate.validUntil}". Treating as no expiry.`);
        }
      }
      // ────────────────────────────────────────────────────────────────────

      const rewardType = couponTemplate.rewardType;
      const rewardValue = couponTemplate.rewardValue;
      const minPurchaseAmount = couponTemplate.minPurchaseAmount || 0;
      const maxDiscountAmount = couponTemplate.maxDiscountAmount || null;
      const title = couponTemplate.title || '';
      const itemName = couponTemplate.itemName || '';

      // Description: note nearby business if applicable
      const description = isNearbyCoupon
        ? `Reward from ${couponBusinessName}! ${couponTemplate.description || 'Thank you for your review.'}`
        : (couponTemplate.description || 'Thank you for your review! Enjoy your reward.');

      const terms = isNearbyCoupon
        ? `Coupon for use at ${couponBusinessName}. ${couponTemplate.terms || 'Can be used once.'}`
        : (couponTemplate.terms || 'Can be used once.');

      const coupon = await Coupon.create({
        type: 'review_reward',
        business: couponBusinessId,  // ← own business ID or nearby business ID
        user: req.user.id,
        review: review._id,
        code: couponCode,
        title,
        itemName,
        rewardType,
        rewardValue,
        description,
        validFrom: new Date(),
        validUntil: couponExpiry, // null means no expiry
        minPurchaseAmount,
        maxDiscountAmount,
        status: 'active',
        terms
      });

      // Generate QR code data
      const qrCodeData = JSON.stringify({
        type: 'coupon',
        couponId: coupon._id.toString(),
        code: couponCode,
        businessId: couponBusinessId.toString(),
        userId: req.user.id.toString(),
        reviewId: review._id.toString(),
        timestamp: new Date().toISOString()
      });
      coupon.qrCodeData = qrCodeData;
      await coupon.save();

      // Increment template usage count (for analytics)
      await Coupon.findByIdAndUpdate(couponTemplate._id, { $inc: { usageCount: 1 } });

      review.couponAwarded = true;
      review.coupon = coupon._id;
      await review.save();

      // Populate the coupon's business so the frontend can display the business name
      await coupon.populate('business', 'name address phone');

      // Send push notification to user
      const couponMessage = rewardType === 'percentage'
        ? `You've earned a ${rewardValue}% discount coupon from ${couponBusinessName}! Show it to the staff to redeem.`
        : rewardType === 'fixed'
          ? `You've earned a £${rewardValue} discount coupon from ${couponBusinessName}! Show it to the staff to redeem.`
          : rewardType === 'buy1get1'
            ? `You've earned a Buy 1 Get 1 coupon from ${couponBusinessName}! Show it to the staff to redeem.`
            : `You've earned a free item coupon from ${couponBusinessName}! Show it to the staff to redeem.`;

      await sendPushNotification(
        req.user.id,
        'Coupon Earned! 🎉',
        couponMessage,
        { type: 'coupon', couponId: coupon._id.toString() }
      );

      // Notify the reviewed business owner about this new review
      try {
        const User = require('../models/User.model');
        const user = await User.findById(req.user.id).select('name');
        await sendPushNotification(
          business.owner,
          '⭐ New Review!',
          `${user.name} left a ${rating}-star review for ${business.name}`,
          {
            type: 'review',
            screen: 'BusinessDashboard',
            reviewId: review._id.toString(),
            businessId: businessId.toString()
          }
        );
        console.log(`✅ Notification sent to business owner for new review`);
      } catch (notifError) {
        console.error('❌ Failed to send review notification:', notifError);
      }

      return res.status(201).json({
        success: true,
        message: 'Review posted successfully',
        review,
        coupon,                         // includes populated business name
        isNearbyCoupon,                 // frontend uses this to show "from [business]" label
        couponBusinessName              // friendly name for display
      });

    } catch (couponError) {
      // ── COUPON ISSUANCE FAILED — REVIEW IS STILL SAVED ──────────────────
      // Any error inside the coupon block (CastError on validUntil, Mongoose
      // ValidationError, network error, etc.) lands here. The review already
      // exists in the database. We MUST return 201 so the frontend knows the
      // review succeeded and shows the scratch card (no-coupon state).
      // We log the full error so it is visible in production logs/Sentry.
      logger.error(`❌ Coupon reward issuance failed for review ${review._id} on business ${businessId}. Review is saved but no coupon was created.`, {
        reviewId: review._id,
        businessId,
        userId: req.user.id,
        errorName: couponError.name,
        errorMessage: couponError.message
      });

      // Notify the business owner about the new review even though reward failed
      try {
        const User = require('../models/User.model');
        const user = await User.findById(req.user.id).select('name');
        await sendPushNotification(
          business.owner,
          '⭐ New Review!',
          `${user.name} left a ${rating}-star review for ${business.name}`,
          {
            type: 'review',
            screen: 'BusinessDashboard',
            reviewId: review._id.toString(),
            businessId: businessId.toString()
          }
        );
      } catch (notifError) {
        console.error('❌ Failed to send review notification after coupon error:', notifError);
      }

      // Return success — the review was saved. No coupon in the response,
      // so the frontend will show the scratch card in its "no reward" state.
      return res.status(201).json({
        success: true,
        message: 'Review posted successfully',
        review
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a business
// @route   GET /api/reviews/business/:businessId?type=recent|old&page=1&limit=10
// @access  Public
exports.getBusinessReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { type } = req.query; // 'recent' | 'old' | undefined (all)

    const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Build date filter based on type
    let dateFilter = {};
    if (type === 'recent') {
      dateFilter = { createdAt: { $gte: SEVEN_DAYS_AGO } };
    } else if (type === 'old') {
      dateFilter = { createdAt: { $lt: SEVEN_DAYS_AGO } };
    }

    const baseFilter = {
      business: req.params.businessId,
      status: 'approved',
      ...dateFilter
    };

    // Sort: for recent → updatedAt desc (most recently edited first), then createdAt desc
    // For old/all → createdAt desc
    const sortOrder = type === 'recent'
      ? { updatedAt: -1, createdAt: -1 }
      : { createdAt: -1 };

    const reviews = await Review.find(baseFilter)
      .populate('user', 'name profileImage')
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(baseFilter);

    // Also return the count of old reviews so the frontend can decide whether
    // to show the "Show Older Reviews" button even before the user taps it
    let oldReviewCount = 0;
    if (!type || type === 'recent') {
      oldReviewCount = await Review.countDocuments({
        business: req.params.businessId,
        status: 'approved',
        createdAt: { $lt: SEVEN_DAYS_AGO }
      });
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      oldReviewCount,
      reviews
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'name profileImage')
      .populate('business', 'name logo category');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const { rating, comment } = req.body;

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.deleteOne();

    // Invalidate live top reviewer cache and trigger websocket update
    invalidateAndEmitTopReviewer(review.business);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked as helpful
    if (review.helpful.includes(req.user.id)) {
      // Remove from helpful
      review.helpful = review.helpful.filter(
        userId => userId.toString() !== req.user.id
      );
    } else {
      // Add to helpful
      review.helpful.push(req.user.id);
    }

    await review.save();

    res.status(200).json({
      success: true,
      helpful: review.helpful.length
    });
  } catch (error) {
    next(error);
  }
};
