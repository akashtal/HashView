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
const FCMService = require('../services/fcm.service');

/**
 * @desc    Register push token for user/business owner
 * @route   POST /api/notifications/register-token
 * @access  Private
 */
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;

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

    // Update push token
    user.pushToken = pushToken;
    user.pushTokenUpdatedAt = new Date();
    await user.save();

    console.log(`✅ Push token registered for user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
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

    // Send to all users
    const result = await FCMService.sendToAllUsers(
      User,
      title,
      message,
      {
        type: 'admin_broadcast',
        ...data
      }
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send notification'
      });
    }

    console.log(`✅ Broadcast sent: ${result.successCount} succeeded, ${result.failureCount} failed`);

    res.status(200).json({
      success: true,
      message: 'Broadcast sent successfully',
      successCount: result.successCount,
      failureCount: result.failureCount
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

    // Get the business owned by this user
    const business = await Business.findOne({ owner: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Send to customers who favorited this business
    const result = await FCMService.sendToBusinessCustomers(
      business._id,
      User,
      title,
      message,
      {
        type: 'business_update',
        businessId: business._id.toString(),
        screen: 'BusinessDetail',
        ...data
      }
    );

    if (!result.success && result.error !== 'No customers with push tokens found for this business') {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send notification'
      });
    }

    const successCount = result.successCount || 0;
    const failureCount = result.failureCount || 0;

    console.log(`✅ Business notification sent: ${successCount} succeeded, ${failureCount} failed`);

    res.status(200).json({
      success: true,
      message: successCount > 0
        ? 'Notification sent successfully'
        : 'No customers to notify (none have favorited your business or enabled notifications)',
      successCount: successCount,
      failureCount: failureCount
    });
  } catch (error) {
    console.error('❌ Error sending business notification:', error);
    next(error);
  }
};

