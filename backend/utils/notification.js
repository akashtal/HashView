const { Expo } = require('expo-server-sdk');
const Notification = require('../models/Notification.model');
const logger = require('./logger');
const {
  getActivePushTokenEntries,
  removePushTokenEverywhere
} = require('./pushTokenRegistry');

// Create Expo SDK client — useFcmV1 uses the modern FCM HTTP v1 API
const expo = new Expo({ useFcmV1: true });

// Android notification channel ID — MUST match the one created in frontend
const ANDROID_CHANNEL_ID = 'hashview-updates';
const NOTIFICATION_RECORD_TYPES = new Set([
  'general',
  'coupon',
  'review',
  'business_verification',
  'kyc',
  'system',
  'admin_broadcast',
  'promotion',
  'announcement',
  'business_update'
]);

const getNotificationRecordType = (type) => {
  const normalized = String(type || 'general').toLowerCase();
  return NOTIFICATION_RECORD_TYPES.has(normalized) ? normalized : 'general';
};

/**
 * Send push notification to a single user.
 * Creates a Notification DB record and sends via Expo Push.
 * Automatically cleans up stale tokens (DeviceNotRegistered).
 */
exports.sendPushNotification = async (userId, title, message, data = {}) => {
  try {
    const User = require('../models/User.model');
    const BusinessOwner = require('../models/BusinessOwner.model');
    // Search BOTH collections — business owners live in BusinessOwner, not User
    let user = await User.findById(userId).select('pushToken email');
    let sentToModel = 'User';
    if (!user) {
      user = await BusinessOwner.findById(userId).select('pushToken pushTokens email');
      sentToModel = 'BusinessOwner';
    } else {
      user = await User.findById(userId).select('pushToken pushTokens email');
    }

    const notification = await Notification.create({
      title,
      message,
      sentTo: userId,
      sentToModel,
      type: getNotificationRecordType(data.type),
      data,
      status: 'pending'
    });

    if (!user) {
      notification.status = 'failed';
      notification.errorMessage = 'User not found in either collection';
      await notification.save();
      logger.error(`[Push] ❌ userId ${userId} not found in User or BusinessOwner`);
      return { success: false, message: 'User not found' };
    }
    const tokenEntries = getActivePushTokenEntries(user, sentToModel);
    logger.info(`[Push] Found ${user.email || userId} | activeTokens=${tokenEntries.length}`);

    if (tokenEntries.length === 0) {
      notification.status = 'failed';
      notification.errorMessage = 'No push token';
      await notification.save();
      return { success: false, message: 'Push token not found' };
    }

    const validTokenEntries = tokenEntries.filter(entry => Expo.isExpoPushToken(entry.token));
    const invalidTokenEntries = tokenEntries.filter(entry => !Expo.isExpoPushToken(entry.token));

    if (invalidTokenEntries.length > 0) {
      logger.warn(`[Push] Invalid Expo tokens for ${user.email || userId}: ${invalidTokenEntries.length} — clearing`);
      await Promise.all(invalidTokenEntries.map(entry => removePushTokenEverywhere(entry.token)));
    }

    if (validTokenEntries.length === 0) {
      notification.status = 'failed';
      notification.errorMessage = 'No valid Expo push tokens';
      await notification.save();
      return { success: false, message: 'Invalid push token' };
    }

    // Build Expo push message with full delivery config
    const pushMessages = validTokenEntries.map(entry => ({
      to: entry.token,
      sound: 'default',
      title,
      body: message,
      data: data,
      priority: 'high',
      channelId: ANDROID_CHANNEL_ID,       // Android 8+ channel (required)
      _contentAvailable: true,              // iOS background delivery
      mutableContent: true,                 // iOS notification service extension
    }));

    const chunks = expo.chunkPushNotifications(pushMessages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        logger.error(`[Push] Expo send error for ${user.email || userId}:`, error.message);
      }
    }

    const successfulTickets = tickets.filter(ticket => ticket?.status === 'ok');
    const staleTickets = tickets.filter(ticket => ticket?.details?.error === 'DeviceNotRegistered');

    if (successfulTickets.length > 0) {
      notification.status = 'sent';
      notification.expoTicketId = successfulTickets[0].id;
      notification.expoPushToken = validTokenEntries[tickets.indexOf(successfulTickets[0])]?.token;
    } else {
      notification.status = 'failed';
      notification.errorMessage = tickets[0]?.message || 'Unknown error';
    }

    if (staleTickets.length > 0) {
      const staleTokens = staleTickets
        .map(ticket => validTokenEntries[tickets.indexOf(ticket)]?.token)
        .filter(Boolean);
      logger.info(`[Push] Token expired for ${user.email || userId} — clearing ${staleTokens.length} token(s)`);
      await Promise.all(staleTokens.map(token => removePushTokenEverywhere(token)));
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

  // Step 1: Fetch users from BOTH collections, then expand each user into all active device tokens.
  const [customers, businessOwners] = await Promise.all([
    User.find({
      _id: { $in: userIds }
    }).select('_id pushToken pushTokens email'),
    BusinessOwner.find({
      _id: { $in: userIds }
    }).select('_id pushToken pushTokens email'),
  ]);

  const users = [
    ...customers.map(user => ({ user, modelName: 'User' })),
    ...businessOwners.map(user => ({ user, modelName: 'BusinessOwner' }))
  ];

  const tokenEntries = users.flatMap(({ user, modelName }) => getActivePushTokenEntries(user, modelName));
  const usersWithToken = new Set(tokenEntries.map(entry => entry.userId.toString()));
  const usersWithoutToken = userIds.filter(id => !usersWithToken.has(id.toString())).length;

  if (usersWithoutToken > 0) {
    logger.info(`[Push] Bulk: ${usersWithoutToken}/${userIds.length} users have no push token — skipped`);
  }

  // Filter valid Expo tokens & clean invalid ones
  const allValidTokenEntries = tokenEntries.filter(entry => Expo.isExpoPushToken(entry.token));
  const invalidTokenEntries = tokenEntries.filter(entry => !Expo.isExpoPushToken(entry.token));
  const seenDeviceTokens = new Set();
  const validTokenEntries = [];

  allValidTokenEntries.forEach((entry) => {
    if (seenDeviceTokens.has(entry.token)) return;
    seenDeviceTokens.add(entry.token);
    validTokenEntries.push(entry);
  });

  const duplicateDeviceCount = allValidTokenEntries.length - validTokenEntries.length;
  if (duplicateDeviceCount > 0) {
    logger.warn(`[Push] ${duplicateDeviceCount} duplicate device token(s) skipped for this send`);
  }

  if (invalidTokenEntries.length > 0) {
    logger.warn(`[Push] ${invalidTokenEntries.length} non-Expo tokens found — clearing`);
    const invalidTokens = [...new Set(invalidTokenEntries.map(entry => entry.token))];
    await Promise.all(invalidTokens.map(token => removePushTokenEverywhere(token)));
  }

  if (validTokenEntries.length === 0) {
    logger.info('[Push] No valid Expo tokens found — nothing to send');
    return { sent: 0, failed: userIds.length, sentIds: [] };
  }

  logger.info(`[Push] Sending "${title}" to ${validTokenEntries.length} devices via Expo Push Service...`);

  // Step 2: Build all messages with full iOS + Android config
  const messages = validTokenEntries.map(entry => ({
    to: entry.token,
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

  const userDelivery = new Map();

  for (let i = 0; i < validTokenEntries.length; i++) {
    const entry = validTokenEntries[i];
    const ticket = allTickets[i];
    const success = ticket && ticket.status === 'ok';
    const deliveryKey = `${entry.modelName}:${entry.userId.toString()}`;

    if (!userDelivery.has(deliveryKey)) {
      userDelivery.set(deliveryKey, {
        userId: entry.userId,
        modelName: entry.modelName,
        email: entry.email,
        success: false,
        ticketId: null,
        token: null,
        errors: []
      });
    }

    const delivery = userDelivery.get(deliveryKey);
    const platform = entry.platform || 'unknown';

    if (success) {
      logger.info(`[Push] OK | ${platform} | ${entry.email || entry.userId} | ticketId=${ticket.id}`);
      delivery.success = true;
      delivery.ticketId = delivery.ticketId || ticket.id;
      delivery.token = delivery.token || entry.token;
    } else {
      const errMsg = ticket?.message || 'Unknown error';
      const errCode = ticket?.details?.error || 'N/A';
      logger.warn(`[Push] FAILED | ${platform} | ${entry.email || entry.userId} | ${errCode}: ${errMsg}`);
      delivery.errors.push(`${errCode}: ${errMsg}`);
      if (errCode === 'DeviceNotRegistered') {
        staleTokenUserIds.push(entry.token);
      }
    }
  }

  for (const delivery of userDelivery.values()) {
    if (delivery.success) {
      sentIds.push(delivery.userId);
    } else {
      failedCount++;
    }

    notificationDocs.push({
      title,
      message,
      sentTo: delivery.userId,
      sentToModel: delivery.modelName,
      type: getNotificationRecordType(data.type),
      data,
      status: delivery.success ? 'sent' : 'failed',
      expoTicketId: delivery.success ? delivery.ticketId : undefined,
      expoPushToken: delivery.success ? delivery.token : undefined,
      errorMessage: delivery.success ? undefined : (delivery.errors.join('; ') || 'Send failed'),
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
    await Promise.all([...new Set(staleTokenUserIds)].map(token => removePushTokenEverywhere(token)));
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
    const staleTokenRecords = [];

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
              staleTokenRecords.push({
                userId: notification.sentTo,
                token: notification.expoPushToken
              });
            }
          }
        }
      } catch (error) {
        logger.error('[Push] Receipt check error:', error.message);
      }
    }

    if (staleTokenRecords.length > 0) {
      const BusinessOwner = require('../models/BusinessOwner.model');
      const staleTokens = staleTokenRecords.map(record => record.token).filter(Boolean);
      const staleUserIdsWithoutToken = staleTokenRecords
        .filter(record => !record.token)
        .map(record => record.userId);

      await Promise.all([
        ...[...new Set(staleTokens)].map(token => removePushTokenEverywhere(token)),
        User.updateMany({ _id: { $in: staleUserIdsWithoutToken } }, { $set: { pushToken: null } }),
        BusinessOwner.updateMany({ _id: { $in: staleUserIdsWithoutToken } }, { $set: { pushToken: null } }),
      ]);
      logger.info(`[Push] Receipt check: cleaned ${staleTokenRecords.length} stale token record(s)`);
    }
  } catch (error) {
    logger.error('[Push] checkNotificationReceipts error:', error.message);
  }
};
