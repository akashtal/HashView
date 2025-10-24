const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

const sendPushNotification = async ({ to, title, body, data = {} }) => {
  try {
    // Validate push tokens
    const validTokens = [];
    for (const token of to) {
      if (Expo.isExpoPushToken(token)) {
        validTokens.push(token);
      } else {
        console.warn(`Invalid push token: ${token}`);
      }
    }

    if (validTokens.length === 0) {
      throw new Error('No valid push tokens provided');
    }

    // Create messages
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default'
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
        throw error;
      }
    }

    return {
      success: true,
      tickets,
      messageCount: messages.length
    };

  } catch (error) {
    console.error('Push notification error:', error);
    throw error;
  }
};

const sendPushNotificationToUser = async (userId, { title, body, data = {} }) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.expoPushTokens || user.expoPushTokens.length === 0) {
      throw new Error('User not found or no push tokens available');
    }

    return await sendPushNotification({
      to: user.expoPushTokens,
      title,
      body,
      data
    });

  } catch (error) {
    console.error('Send push notification to user error:', error);
    throw error;
  }
};

module.exports = {
  sendPushNotification,
  sendPushNotificationToUser
};
