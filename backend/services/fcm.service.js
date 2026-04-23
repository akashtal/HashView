/**
 * FCM Service — Push Notification Wrapper
 *
 * ⚠️  IMPORTANT ARCHITECTURE NOTE:
 * The frontend uses expo-notifications which generates ExponentPushToken[xxx] values.
 * These CANNOT be sent directly via Firebase Admin SDK (admin.messaging()).
 * Firebase Admin SDK only accepts native FCM registration tokens.
 *
 * The correct flow is:
 *   Frontend (ExponentPushToken) → Backend → Expo Push Service → APNs/FCM → Device
 *
 * This service now delegates to utils/notification.js which uses expo-server-sdk correctly.
 */

const { sendBulkNotifications, sendPushNotification } = require('../utils/notification');

class FCMService {
    /**
     * Send notification to a single device token/user.
     * @param {string} userId - User ID (not a token)
     * @param {string} title
     * @param {string} message
     * @param {object} data
     */
    async sendToToken(userId, title, message, data = {}) {
        return await sendPushNotification(userId, title, message, data);
    }

    /**
     * Send notification to multiple users by user ID array.
     * @param {Array} userIds - Array of user IDs
     * @param {string} title
     * @param {string} message
     * @param {object} data
     */
    async sendToMultipleTokens(userIds, title, message, data = {}) {
        return await sendBulkNotifications(userIds, title, message, data);
    }

    /**
     * Send broadcast to all users with push tokens.
     * @param {object} User - User mongoose model
     * @param {string} title
     * @param {string} message
     * @param {object} data
     */
    async sendToAllUsers(User, title, message, data = {}) {
        try {
            const users = await User.find({
                $or: [
                    { pushToken: { $exists: true, $ne: null } },
                    { 'pushTokens.token': { $exists: true, $ne: null } }
                ],
            }).select('_id');

            if (!users || users.length === 0) {
                return { success: false, error: 'No users with push tokens found' };
            }

            const userIds = users.map(u => u._id);
            const result = await sendBulkNotifications(userIds, title, message, data);

            return {
                success: true,
                successCount: result.sent,
                failureCount: result.failed,
            };
        } catch (error) {
            console.error('[FCMService] sendToAllUsers error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to customers who reviewed or favorited a business.
     * @param {string} businessId
     * @param {object} User - User mongoose model
     * @param {string} title
     * @param {string} message
     * @param {object} data
     */
    async sendToBusinessCustomers(businessId, User, title, message, data = {}) {
        try {
            const Review = require('../models/Review.model');

            const [reviewerIds, favouriters] = await Promise.all([
                Review.find({ business: businessId }).distinct('user'),
                User.find({
                    favoritePlaces: businessId,
                    status: 'active',
                }).select('_id'),
            ]);

            const activeReviewers = reviewerIds.length > 0
                ? await User.find({ _id: { $in: reviewerIds }, status: 'active' }).select('_id')
                : [];

            const seen = new Set();
            const allTargetIds = [];
            for (const id of [...activeReviewers.map(u => u._id), ...favouriters.map(u => u._id)]) {
                const key = id.toString();
                if (!seen.has(key)) {
                    seen.add(key);
                    allTargetIds.push(id);
                }
            }

            if (allTargetIds.length === 0) {
                return {
                    success: false,
                    error: 'No customers with push tokens found for this business',
                    sentCount: 0,
                };
            }

            const result = await sendBulkNotifications(allTargetIds, title, message, {
                type: 'business_update',
                businessId: businessId.toString(),
                ...data,
            });

            return {
                success: true,
                successCount: result.sent,
                failureCount: result.failed,
            };
        } catch (error) {
            console.error('[FCMService] sendToBusinessCustomers error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FCMService();
