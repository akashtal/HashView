const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification.model');
const logger = require('./logger');

// Create Expo SDK client — useFcmV1 uses the modern FCM HTTP v1 API
const expo = new Expo({ useFcmV1: true });

// Android notification channel ID — MUST match the one created in frontend
const ANDROID_CHANNEL_ID = 'hashview-updates';

/**
 * Send push notification to a single user.
 * Creates a Notification DB record and sends via Expo Push.
 * Automatically cleans up stale tokens (DeviceNotRegistered).
 */
exports.sendPushNotification = async (userId, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      title,
      message,
      sentTo: userId,
      type: data.type || 'general',
      data,
      status: 'pending'
    });

    const User = require('../models/User.model');
    const user = await User.findById(userId).select('pushToken email');

    if (!user) {
      notification.status = 'failed';
      notification.errorMessage = 'User not found';
      await notification.save();
      return { success: false, message: 'User not found' };
    }

    if (!user.pushToken) {
      notification.status = 'failed';
      notification.errorMessage = 'No push token';
      await notification.save();
      return { success: false, message: 'Push token not found' };
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      logger.warn(`[Push] Invalid token for ${user.email || userId}: ${user.pushToken} — clearing`);
      await User.findByIdAndUpdate(userId, { $set: { pushToken: null } });
      notification.status = 'failed';
      notification.errorMessage = 'Invalid push token format — cleared';
      await notification.save();
      return { success: false, message: 'Invalid push token' };
    }

    // Build Expo push message with full delivery config
    const pushMessage = {
      to: user.pushToken,
      sound: 'default',
      title,
      body: message,
      data: data,
      priority: 'high',
      channelId: ANDROID_CHANNEL_ID,       // Android 8+ channel (required)
      _contentAvailable: true,              // iOS background delivery
      mutableContent: true,                 // iOS notification service extension
    };

    const chunks = expo.chunkPushNotifications([pushMessage]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error(`[Push] Expo send error for ${user.email || userId}:`, error.message);
      }
    }

    if (tickets.length > 0 && tickets[0].status === 'ok') {
      notification.status = 'sent';
      notification.expoTicketId = tickets[0].id;
    } else {
      notification.status = 'failed';
      notification.errorMessage = tickets[0]?.message || 'Unknown error';

      // Auto-cleanup stale tokens
      if (tickets[0]?.details?.error === 'DeviceNotRegistered') {
        logger.info(`[Push] Token expired for ${user.email || userId} — clearing`);
        await User.findByIdAndUpdate(userId, { $set: { pushToken: null } });
      }
    }

    await notification.save();
    return { success: notification.status === 'sent', notification, tickets };
  } catch (error) {
    logger.error('[Push] sendPushNotification error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Send notifications to multiple users in BULK using Expo's batch API.
 * Much faster than N individual calls — up to 100 messages per HTTP request.
 * Automatically cleans up stale/invalid tokens.
 */
exports.sendBulkNotifications = async (userIds, title, message, data = {}) => {
  if (!userIds || userIds.length === 0) {
    return { sent: 0, failed: 0, sentIds: [] };
  }

  const User = require('../models/User.model');
  const BusinessOwner = require('../models/BusinessOwner.model');

  // Step 1: Fetch tokens from BOTH User and BusinessOwner collections
  const [customers, businessOwners] = await Promise.all([
    User.find({
      _id: { $in: userIds },
      pushToken: { $exists: true, $ne: null }
    }).select('_id pushToken email'),
    BusinessOwner.find({
      _id: { $in: userIds },
      pushToken: { $exists: true, $ne: null }
    }).select('_id pushToken email'),
  ]);

  const users = [...customers, ...businessOwners];
  const usersWithoutToken = userIds.length - users.length;

  if (usersWithoutToken > 0) {
    logger.info(`[Push] Bulk: ${usersWithoutToken}/${userIds.length} users have no push token — skipped`);
  }

  // Filter valid Expo tokens & clean invalid ones
  const validUsers = users.filter(u => Expo.isExpoPushToken(u.pushToken));
  const invalidTokenUsers = users.filter(u => !Expo.isExpoPushToken(u.pushToken));

  if (invalidTokenUsers.length > 0) {
    logger.warn(`[Push] ${invalidTokenUsers.length} non-Expo tokens found (likely stale FCM tokens) — clearing`);
    const invalidIds = invalidTokenUsers.map(u => u._id);
    await Promise.all([
      User.updateMany({ _id: { $in: invalidIds } }, { $set: { pushToken: null } }),
      BusinessOwner.updateMany({ _id: { $in: invalidIds } }, { $set: { pushToken: null } }),
    ]);
  }

  if (validUsers.length === 0) {
    logger.info('[Push] No valid Expo tokens found — nothing to send');
    return { sent: 0, failed: userIds.length, sentIds: [] };
  }

  logger.info(`[Push] Sending "${title}" to ${validUsers.length} devices via Expo Push Service...`);

  // Step 2: Build all messages with full iOS + Android config
  const messages = validUsers.map(user => ({
    to: user.pushToken,
    sound: 'default',
    title,
    body: message,
    data: data,
    priority: 'high',
    channelId: ANDROID_CHANNEL_ID,  // Android 8+ (ignored on iOS)
    _contentAvailable: true,         // iOS background delivery
    mutableContent: true,            // iOS notification service extension
  }));

  // Step 3: Send in Expo chunks (up to 100 per HTTP call)
  const chunks = expo.chunkPushNotifications(messages);
  const allTickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      allTickets.push(...ticketChunk);
    } catch (error) {
      logger.error('[Push] Bulk chunk error:', error.message);
      allTickets.push(...chunk.map(() => ({ status: 'error', message: error.message })));
    }
  }

  // Step 4: Process results & create notification records
  const sentIds = [];
  let failedCount = 0;
  const notificationDocs = [];
  const staleTokenUserIds = [];

  for (let i = 0; i < validUsers.length; i++) {
    const user = validUsers[i];
    const ticket = allTickets[i];
    const success = ticket && ticket.status === 'ok';

    // Detect platform from Expo token prefix for logging
    const platform = user.pushToken.includes('ExponentPushToken') ? '📱 Expo' : 'Unknown';

    if (success) {
      logger.info(`[Push] ✅ ${platform} | ${user.email || user._id} | ticketId=${ticket.id}`);
      sentIds.push(user._id);
    } else {
      const errMsg = ticket?.message || 'Unknown error';
      const errCode = ticket?.details?.error || 'N/A';
      logger.warn(`[Push] ❌ ${platform} | ${user.email || user._id} | ${errCode}: ${errMsg}`);
      failedCount++;
      if (errCode === 'DeviceNotRegistered') {
        staleTokenUserIds.push(user._id);
      }
    }

    notificationDocs.push({
      title,
      message,
      sentTo: user._id,
      type: data.type || 'general',
      data,
      status: success ? 'sent' : 'failed',
      expoTicketId: success ? ticket.id : undefined,
      errorMessage: success ? undefined : (ticket?.message || 'Send failed'),
    });
  }

  // Step 5: Batch insert notification records
  try {
    await Notification.insertMany(notificationDocs, { ordered: false });
  } catch (err) {
    logger.error('[Push] Bulk notification insert error:', err.message);
  }

  // Step 6: Clean up stale tokens from both collections
  if (staleTokenUserIds.length > 0) {
    await Promise.all([
      User.updateMany({ _id: { $in: staleTokenUserIds } }, { $set: { pushToken: null } }),
      BusinessOwner.updateMany({ _id: { $in: staleTokenUserIds } }, { $set: { pushToken: null } }),
    ]);
    logger.info(`[Push] Cleaned ${staleTokenUserIds.length} stale (DeviceNotRegistered) tokens`);
  }

  logger.info(`[Push] ✅ Bulk complete: ${sentIds.length} sent, ${failedCount + usersWithoutToken} failed (${usersWithoutToken} had no token)`);
  return { sent: sentIds.length, failed: failedCount + usersWithoutToken, sentIds };
};

/**
 * Check notification receipts from Expo and update DB records.
 * Should be called periodically (e.g. every 15 minutes via cron).
 */
exports.checkNotificationReceipts = async () => {
  try {
    const notifications = await Notification.find({
      status: 'sent',
      expoTicketId: { $exists: true }
    }).limit(500);

    if (notifications.length === 0) return;

    const receiptIds = notifications.map(n => n.expoTicketId);
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    const User = require('../models/User.model');
    const staleTokenUserIds = [];

    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          const notification = notifications.find(n => n.expoTicketId === receiptId);
          if (!notification) continue;

          if (receipt.status === 'error') {
            notification.status = 'failed';
            notification.errorMessage = receipt.message;
            await notification.save();

            if (receipt.details?.error === 'DeviceNotRegistered') {
              staleTokenUserIds.push(notification.sentTo);
            }
          }
        }
      } catch (error) {
        logger.error('[Push] Receipt check error:', error.message);
      }
    }

    if (staleTokenUserIds.length > 0) {
      await User.updateMany(
        { _id: { $in: staleTokenUserIds } },
        { $set: { pushToken: null } }
      );
      logger.info(`[Push] Receipt check: cleaned ${staleTokenUserIds.length} stale tokens`);
    }
  } catch (error) {
    logger.error('[Push] checkNotificationReceipts error:', error.message);
  }
};
