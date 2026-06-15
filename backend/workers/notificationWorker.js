const { Worker } = require('bullmq');
const { Expo } = require('expo-server-sdk');

const User = require('../models/User.model');
const Business = require('../models/Business.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const { sendPushNotification } = require('../utils/notification');

const expo = new Expo();

const redisOptions = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

/**
 * IMPORTANT DATA MODEL NOTES:
 * - Regular customers → stored in User model (role: 'user')
 * - Business owners  → stored in BusinessOwner model (role: 'business')
 * - The Business model has an `owner` field → ObjectId ref to BusinessOwner
 * - Push tokens for business owners are stored on BusinessOwner.pushTokens[]
 * - Push tokens for customers are stored on User.pushTokens[]
 */

const notificationWorker = new Worker('notifications', async (job) => {
  console.log(`[NotificationWorker] Processing job ${job.id} of type ${job.name}`);
  const { type, payload } = job.data;

  try {
    if (type === 'order.created') {
      await handleOrderCreatedPush(payload);
    } else if (type === 'order.status_changed') {
      await handleOrderStatusPush(payload);
    } else {
      console.log(`[NotificationWorker] Unknown job type: ${type}`);
    }
  } catch (error) {
    console.error(`[NotificationWorker] Error processing job ${job.id}:`, error);
    throw error;
  }
}, { connection: redisOptions });

notificationWorker.on('completed', job => {
  console.log(`[NotificationWorker] Job ${job.id} completed!`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] Job ${job.id} failed:`, err);
});

// ── Handler: New order placed — notify the business owner ──────────────────
async function handleOrderCreatedPush(payload) {
  const { orderId, businessId, businessName, orderNumber, tableNumber, totalAmount } = payload;

  try {
    // Find the business → get its owner (BusinessOwner document)
    const business = await Business.findById(businessId).populate('owner');
    if (!business || !business.owner) {
      console.log(`[NotificationWorker] No business/owner found for businessId=${businessId}`);
      return;
    }

    const ownerId = business.owner._id; // BusinessOwner._id

    // Use the shared sendPushNotification utility — it handles BusinessOwner lookup,
    // DB record creation, and token cleanup automatically.
    await sendPushNotification(
      ownerId,
      '🍽️ New Order Received!',
      `Table ${tableNumber} placed Order #${orderNumber} — ${totalAmount}`,
      {
        type: 'new_order',
        orderId: orderId?.toString(),
        businessId: businessId?.toString(),
        screen: 'OrdersDashboard'
      }
    );

    console.log(`[NotificationWorker] ✅ New order push sent to owner ${ownerId}`);
  } catch (error) {
    console.error('[NotificationWorker] handleOrderCreatedPush error:', error);
    throw error;
  }
}

// ── Handler: Order status changed — notify the customer ───────────────────
async function handleOrderStatusPush(payload) {
  const { orderId, customerId, status, businessName, orderNumber } = payload;

  // Guest orders have no customerId — cannot push notify
  if (!customerId) {
    console.log('[NotificationWorker] Guest order — skipping customer push');
    return;
  }

  const statusMessages = {
    accepted: `✅ Good news! ${businessName} has accepted your order #${orderNumber}.`,
    preparing: `👨‍🍳 ${businessName} is now preparing your order #${orderNumber}!`,
    ready: `🔔 Your order #${orderNumber} is ready to be served!`,
    delivered: `🎉 Your order #${orderNumber} has been delivered. Enjoy your meal!`,
    cancelled: `❌ Sorry, your order #${orderNumber} has been cancelled by ${businessName}.`,
  };

  const body = statusMessages[status] || `Your order #${orderNumber} status has been updated to: ${status}.`;

  try {
    // customerId is a User._id (customers are in User model)
    await sendPushNotification(
      customerId,
      'Order Update 📱',
      body,
      {
        type: 'order_status',
        orderId: orderId?.toString(),
        status,
        screen: 'OrderTracking'
      }
    );

    console.log(`[NotificationWorker] ✅ Order status push sent to customer ${customerId}`);
  } catch (error) {
    console.error('[NotificationWorker] handleOrderStatusPush error:', error);
    throw error;
  }
}

module.exports = notificationWorker;
