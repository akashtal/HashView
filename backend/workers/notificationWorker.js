const { Worker } = require('bullmq');
const { Expo } = require('expo-server-sdk');
const mongoose = require('mongoose');

// We don't import models here directly if this runs in the same process, but it's safe if models are registered.
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');

// Create a new Expo client
const expo = new Expo();

const redisOptions = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

// The worker processes jobs from the 'notifications' queue
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

// Implementation details for push notifications

async function handleOrderCreatedPush(payload) {
  const { orderId, businessId, businessName, orderNumber, tableNumber, totalAmount } = payload;
  
  // Find the business owner(s) to notify
  // In a real scenario, you'd look up the business.owner and get their Expo push token.
  // For now, we mock the behavior or implement the actual query if pushToken exists on BusinessOwner.
  
  const owner = await BusinessOwner.findOne({ 'business': businessId });
  if (owner && owner.pushToken && Expo.isExpoPushToken(owner.pushToken)) {
    const messages = [{
      to: owner.pushToken,
      sound: 'default',
      title: 'New Order Received! 🍽️',
      body: `Table ${tableNumber} placed Order #${orderNumber} for ${totalAmount}`,
      data: { orderId, type: 'new_order' },
    }];

    await sendPushNotifications(messages);
  }
}

async function handleOrderStatusPush(payload) {
  const { orderId, customerId, status, businessName, orderNumber } = payload;
  
  if (!customerId) return; // Guest order, can't push notify

  const customer = await User.findById(customerId);
  if (customer && customer.pushToken && Expo.isExpoPushToken(customer.pushToken)) {
    let body = `Your order #${orderNumber} from ${businessName} has been updated to ${status}.`;
    if (status === 'preparing') body = `Great news! ${businessName} is preparing your order.`;
    if (status === 'ready') body = `Your order is ready to be served!`;
    
    const messages = [{
      to: customer.pushToken,
      sound: 'default',
      title: 'Order Status Update 📱',
      body,
      data: { orderId, type: 'order_status' },
    }];

    await sendPushNotifications(messages);
  }
}

async function sendPushNotifications(messages) {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('[NotificationWorker] Error sending push notification chunk:', error);
    }
  }
}

module.exports = notificationWorker;
