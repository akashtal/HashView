const admin = require('firebase-admin');
const path = require('path');

/**
 * Firebase Cloud Messaging (FCM) Service
 * Handles sending push notifications via Firebase Admin SDK
 */

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../hashviewapp-firebase-adminsdk-fbsvc-4c9da5c087.json');

try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('  Make sure hashviewapp-firebase-adminsdk-fbsvc-4c9da5c087.json exists in backend root');
}

class FCMService {
    /**
     * Send notification to a single device
     * @param {string} token - Expo push token
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {object} data - Additional data to send with notification
     * @returns {Promise<object>} Send result
     */
    async sendToToken(token, title, message, data = {}) {
        try {
            const payload = {
                notification: {
                    title: title,
                    body: message,
                },
                data: {
                    ...data,
                    // Convert all data values to strings (FCM requirement)
                    timestamp: Date.now().toString(),
                },
                token: token,
            };

            const response = await admin.messaging().send(payload);
            console.log('✅ FCM notification sent to single device:', response);

            return {
                success: true,
                messageId: response,
            };
        } catch (error) {
            console.error('❌ FCM send error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send notification to multiple devices
     * @param {string[]} tokens - Array of Expo push tokens
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {object} data - Additional data to send with notification
     * @returns {Promise<object>} Send result with success/failure counts
     */
    async sendToMultipleTokens(tokens, title, message, data = {}) {
        try {
            if (!tokens || tokens.length === 0) {
                return {
                    success: false,
                    error: 'No tokens provided',
                };
            }

            // Filter out invalid tokens
            const validTokens = tokens.filter(token => token && typeof token === 'string');

            if (validTokens.length === 0) {
                return {
                    success: false,
                    error: 'No valid tokens found',
                };
            }

            const payload = {
                notification: {
                    title: title,
                    body: message,
                },
                data: {
                    ...data,
                    timestamp: Date.now().toString(),
                },
            };

            const response = await admin.messaging().sendEachForMulticast({
                tokens: validTokens,
                ...payload,
            });

            console.log(`✅ FCM multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`);

            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                results: response.responses,
            };
        } catch (error) {
            console.error('❌ FCM multicast error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send notification to all users (admin broadcast)
     * @param {object} User - User model
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {object} data - Additional data
     * @returns {Promise<object>} Send result
     */
    async sendToAllUsers(User, title, message, data = {}) {
        try {
            console.log('📊 Fetching all user push tokens for broadcast...');

            // Get all users with valid push tokens
            const users = await User.find({
                pushToken: { $exists: true, $ne: null },
                role: 'customer',
            }).select('pushToken');

            if (!users || users.length === 0) {
                return {
                    success: false,
                    error: 'No users with push tokens found',
                };
            }

            const tokens = users.map(user => user.pushToken);
            console.log(`📤 Sending broadcast to ${tokens.length} users...`);

            return await this.sendToMultipleTokens(tokens, title, message, data);
        } catch (error) {
            console.error('❌ FCM broadcast error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send notification to customers who favorited a specific business
     * @param {string} businessId - Business ID
     * @param {object} User - User model
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {object} data - Additional data
     * @returns {Promise<object>} Send result
     */
    async sendToBusinessCustomers(businessId, User, title, message, data = {}) {
        try {
            console.log(`📊 Fetching customers who favorited business ${businessId}...`);

            // Get all users who favorited this business and have push tokens
            const users = await User.find({
                favoritePlaces: businessId,
                pushToken: { $exists: true, $ne: null },
            }).select('pushToken');

            if (!users || users.length === 0) {
                return {
                    success: false,
                    error: 'No customers with push tokens found for this business',
                    sentCount: 0,
                };
            }

            const tokens = users.map(user => user.pushToken);
            console.log(`📤 Sending notification to ${tokens.length} customers...`);

            return await this.sendToMultipleTokens(tokens, title, message, {
                type: 'business_update',
                businessId: businessId,
                ...data,
            });
        } catch (error) {
            console.error('❌ FCM business notification error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = new FCMService();
