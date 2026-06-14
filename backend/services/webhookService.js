const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook.model');
const logger = require('../utils/logger');
const CircuitBreaker = require('../utils/circuitBreaker');

const webhookBreaker = new CircuitBreaker('Webhook Dispatch', 10, 60000); // 1 min timeout if 10 consecutive failures

/**
 * Dispatches an event payload to all active webhooks subscribed to the event for a given business.
 */
exports.dispatchWebhook = async (businessId, eventName, payload) => {
  try {
    const webhooks = await Webhook.find({
      business: businessId,
      isActive: true,
      events: eventName
    });

    if (webhooks.length === 0) return;

    const dataString = JSON.stringify({
      event: eventName,
      timestamp: new Date().toISOString(),
      data: payload
    });

    // We do NOT want to block the main thread waiting for webhooks.
    // In a production system this should ideally go into a queue (like BullMQ).
    // For now we run them asynchronously without awaiting them in the main thread.
    webhooks.forEach(webhook => {
      const signature = crypto.createHmac('sha256', webhook.secret)
        .update(dataString)
        .digest('hex');

      webhookBreaker.execute(() => 
        axios.post(webhook.url, dataString, {
          headers: {
            'Content-Type': 'application/json',
            'X-HashView-Signature': `sha256=${signature}`
          },
          timeout: 5000 // 5 seconds max
        })
      ).catch(async (error) => {
        logger.error(`Webhook delivery failed for ${webhook.url}: ${error.message}`);
        
        // Auto-disable webhook if it fails repeatedly
        webhook.failureCount += 1;
        if (webhook.failureCount >= 10) {
          webhook.isActive = false;
          logger.warn(`Webhook ${webhook._id} disabled due to consecutive failures.`);
        }
        await webhook.save();
      }).then(async (response) => {
        if (response && webhook.failureCount > 0) {
          webhook.failureCount = 0;
          await webhook.save();
        }
      });
    });

  } catch (error) {
    logger.error('Error dispatching webhook:', error);
  }
};
