const Notification = require('../models/Notification.model');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    console.log(`📬 Getting notifications for user: ${req.user.id}, status filter: ${status || 'all'}`);

    const query = { sentTo: req.user.id };

    // Add status filter if provided
    if (status === 'unread') {
      query.status = { $ne: 'read' };
    } else if (status === 'read') {
      query.status = 'read';
    }

    const notifications = await Notification.find(query)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ sentTo: req.user.id });
    const unreadCount = await Notification.countDocuments({
      sentTo: req.user.id,
      status: { $ne: 'read' }
    });

    console.log(`   ✅ Found ${notifications.length} notifications (${unreadCount} unread)`);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
      notifications
    });
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.sentTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { sentTo: req.user.id, status: { $ne: 'read' } },
      { status: 'read', readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.sentTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PUSH NOTIFICATION ENDPOINTS (FCM)
// ============================================

const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const Business = require('../models/Business.model');
const Review = require('../models/Review.model');
const { sendBulkNotifications, sendPushNotification } = require('../utils/notification');
const { registerDevicePushToken } = require('../utils/pushTokenRegistry');

/**
 * @desc    Register push token for user/business owner
 * @route   POST /api/notifications/register-token
 * @access  Private
 */
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, platform, deviceId, installationId, appVersion } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    console.log(`📱 Registering push token for user ${req.user.id}...`);

    // Determine if user is a customer or business owner
    let user;

    if (req.user.role === 'business_owner' || req.user.role === 'business') {
      user = await BusinessOwner.findById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const registration = await registerDevicePushToken(user, pushToken, {
      platform,
      deviceId,
      installationId,
      appVersion
    });

    console.log(`✅ Push token registered for user ${req.user.id}; active devices=${registration.activeTokenCount}`);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      activeTokenCount: registration.activeTokenCount
    });
  } catch (error) {
    if (error.code === 'INVALID_EXPO_PUSH_TOKEN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Expo push token'
      });
    }

    console.error('❌ Error registering push token:', error);
    next(error);
  }
};

/**
 * @desc    Admin sends broadcast notification to all users
 * @route   POST /api/notifications/send
 * @access  Admin only
 */
exports.sendAdminBroadcast = async (req, res, next) => {
  try {
    const { title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    console.log(`📢 Admin ${req.user.id} sending broadcast notification...`);

    // Fetch ALL customer user IDs with push tokens (both User and BusinessOwner collections)
    const [customerUsers, businessOwners] = await Promise.all([
      User.find({
        status: 'active',
        $or: [
          { pushToken: { $exists: true, $ne: null } },
          { 'pushTokens.token': { $exists: true, $ne: null } }
        ]
      }).select('_id'),
      BusinessOwner.find({
        status: 'active',
        $or: [
          { pushToken: { $exists: true, $ne: null } },
          { 'pushTokens.token': { $exists: true, $ne: null } }
        ]
      }).select('_id'),
    ]);

    const allUserIds = [
      ...customerUsers.map(u => u._id),
      ...businessOwners.map(u => u._id),
    ];

    if (allUserIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users with push tokens found',
        sent: 0,
        failed: 0
      });
    }

    console.log(`📤 Broadcasting to ${allUserIds.length} users (${customerUsers.length} customers + ${businessOwners.length} business owners)...`);

    // Use Expo Push Service — the only correct path for ExponentPushToken[] values
    const result = await sendBulkNotifications(
      allUserIds,
      title,
      message,
      { type: 'admin_broadcast', ...data }
    );

    console.log(`✅ Broadcast: sent=${result.sent}, failed=${result.failed}`);

    res.status(200).json({
      success: true,
      message: 'Broadcast sent successfully',
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('❌ Error sending admin broadcast:', error);
    next(error);
  }
};

/**
 * @desc    Business owner sends notification to their customers
 * @route   POST /api/business/notifications/send
 * @access  Business owner only
 */
exports.sendBusinessNotification = async (req, res, next) => {
  try {
    const { title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    console.log(`📢 Business owner ${req.user.id} sending notification...`);

    const business = await Business.findOne({ owner: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get unique customer IDs who reviewed OR favorited this business
    const [reviewerIds, favouriters] = await Promise.all([
      Review.find({ business: business._id }).distinct('user'),
      User.find({
        favoritePlaces: business._id,
        status: 'active',
      }).select('_id'),
    ]);

    const activeReviewers = reviewerIds.length > 0
      ? await User.find({
          _id: { $in: reviewerIds },
          status: 'active'
        }).select('_id')
      : [];

    // Merge + deduplicate
    const seen = new Set();
    const allTargetIds = [];
    for (const id of [...activeReviewers.map(u => u._id), ...favouriters.map(u => u._id)]) {
      const key = id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        allTargetIds.push(id);
      }
    }

    if (allTargetIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No customers to notify (none have reviewed or favorited your business)',
        sent: 0,
        failed: 0
      });
    }

    console.log(`📤 Sending to ${allTargetIds.length} unique customers for business ${business._id}...`);

    // Use Expo Push Service
    const result = await sendBulkNotifications(
      allTargetIds,
      title,
      message,
      {
        ...data,
        type: 'BUSINESS_UPDATE',
        businessId: business._id.toString(),
        screen: 'BusinessDetail',
        targetTab: 'updates'
      }
    );

    console.log(`✅ Business notification: sent=${result.sent}, failed=${result.failed}`);

    res.status(200).json({
      success: true,
      message: result.sent > 0 ? 'Notification sent successfully' : 'No customers with push notifications enabled',
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('❌ Error sending business notification:', error);
    next(error);
  }
};
