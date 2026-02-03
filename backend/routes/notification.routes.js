const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerPushToken,
  sendAdminBroadcast,
  sendBusinessNotification
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

// Notification history routes
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

// Push notification routes
router.post('/register-token', registerPushToken);
router.post('/send', authorize('admin'), sendAdminBroadcast);

module.exports = router;

