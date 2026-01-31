const OneSignal = require('onesignal-node');

// Initialize OneSignal client
const client = new OneSignal.Client(
    process.env.ONESIGNAL_APP_ID,
    process.env.ONESIGNAL_REST_API_KEY
);

class OneSignalService {
    // Send notification to specific user
    async sendToUser(userId, title, message, data = {}) {
        try {
            if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
                console.warn('⚠️  OneSignal not configured');
                return { success: false, error: 'OneSignal not configured' };
            }

            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                include_external_user_ids: [userId.toString()],
            };

            const response = await client.createNotification(notification);
            console.log('✅ OneSignal notification sent:', response.body);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('❌ OneSignal send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send to multiple users
    async sendToUsers(userIds, title, message, data = {}) {
        try {
            if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
                return { success: false, error: 'OneSignal not configured' };
            }

            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                include_external_user_ids: userIds.map(id => id.toString()),
            };

            const response = await client.createNotification(notification);
            console.log(`✅ OneSignal sent to ${userIds.length} users`);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('OneSignal bulk send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send to segment (advanced targeting)
    async sendToSegment(segmentName, title, message, data = {}) {
        try {
            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                included_segments: [segmentName],
            };

            const response = await client.createNotification(notification);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('OneSignal segment send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send to users with specific tags
    async sendToTags(filters, title, message, data = {}) {
        try {
            // Example filters:
            // [{"field": "tag", "key": "user_type", "relation": "=", "value": "business"}]
            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                filters: filters,
            };

            const response = await client.createNotification(notification);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('OneSignal tag send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send notification with image
    async sendWithImage(userId, title, message, imageUrl, data = {}) {
        try {
            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                big_picture: imageUrl,
                ios_attachments: { id: imageUrl },
                include_external_user_ids: [userId.toString()],
            };

            const response = await client.createNotification(notification);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('OneSignal image send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Schedule notification for later
    async scheduleNotification(userId, title, message, sendAfter, data = {}) {
        try {
            // sendAfter: ISO 8601 format or Date object
            const notification = {
                headings: { en: title },
                contents: { en: message },
                data: data,
                include_external_user_ids: [userId.toString()],
                send_after: sendAfter instanceof Date ? sendAfter.toISOString() : sendAfter,
            };

            const response = await client.createNotification(notification);
            return { success: true, response: response.body };
        } catch (error) {
            console.error('OneSignal schedule error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new OneSignalService();
