const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendPushNotification } = require('../services/pushNotificationService');

const router = express.Router();

// @route   POST /api/notifications/send
// @desc    Send push notification to user(s)
// @access  Private (Admin)
router.post('/send', [
  auth,
  authorize('admin'),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('title').notEmpty().withMessage('Notification title is required'),
  body('body').notEmpty().withMessage('Notification body is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userIds, title, body, data = {} } = req.body;

    // Get users with their push tokens
    const users = await User.find({
      _id: { $in: userIds },
      expoPushTokens: { $exists: true, $not: { $size: 0 } }
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with push tokens'
      });
    }

    // Send notifications
    const results = [];
    for (const user of users) {
      try {
        const result = await sendPushNotification({
          to: user.expoPushTokens,
          title,
          body,
          data: {
            ...data,
            userId: user._id.toString()
          }
        });
        results.push({ userId: user._id, success: true, result });
      } catch (error) {
        console.error(`Failed to send notification to user ${user._id}:`, error);
        results.push({ userId: user._id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Notifications sent: ${successCount} successful, ${failureCount} failed`,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notifications'
    });
  }
});

// @route   POST /api/notifications/send-to-all
// @desc    Send push notification to all users
// @access  Private (Admin)
router.post('/send-to-all', [
  auth,
  authorize('admin'),
  body('title').notEmpty().withMessage('Notification title is required'),
  body('body').notEmpty().withMessage('Notification body is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, data = {} } = req.body;

    // Get all users with push tokens
    const users = await User.find({
      expoPushTokens: { $exists: true, $not: { $size: 0 } }
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with push tokens'
      });
    }

    // Send notifications in batches
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          const result = await sendPushNotification({
            to: user.expoPushTokens,
            title,
            body,
            data: {
              ...data,
              userId: user._id.toString()
            }
          });
          results.push({ userId: user._id, success: true, result });
        } catch (error) {
          console.error(`Failed to send notification to user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Notifications sent: ${successCount} successful, ${failureCount} failed`,
      data: {
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Send notification to all error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notifications'
    });
  }
});

module.exports = router;
