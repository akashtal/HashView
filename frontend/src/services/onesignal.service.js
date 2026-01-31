import OneSignal from 'react-native-onesignal';

class OneSignalService {
    // Get OneSignal Player ID (device identifier)
    async getPlayerId() {
        const deviceState = await OneSignal.getDeviceState();
        return deviceState?.userId; // This is the OneSignal Player ID
    }

    // Set user tags for segmentation
    setUserTags(tags) {
        OneSignal.sendTags(tags);
        console.log('✅ OneSignal tags set:', tags);
    }

    // Remove user tags
    deleteUserTags(keys) {
        OneSignal.deleteTags(keys);
    }

    // Get user tags
    async getUserTags() {
        return await OneSignal.getTags();
    }

    // Set external user ID (your database user ID)
    setExternalUserId(userId) {
        OneSignal.setExternalUserId(userId.toString());
        console.log('✅ OneSignal external user ID set:', userId);
    }

    // Remove external user ID (on logout)
    removeExternalUserId() {
        OneSignal.removeExternalUserId();
        console.log('✅ OneSignal external user ID removed');
    }

    // Set email for email campaigns
    setEmail(email) {
        OneSignal.setEmail(email);
    }

    // Logout email
    logoutEmail() {
        OneSignal.logoutEmail();
    }

    // Disable/Enable notifications
    disableNotifications() {
        OneSignal.disablePush(true);
    }

    enableNotifications() {
        OneSignal.disablePush(false);
    }

    // Check if user subscribed to notifications
    async isSubscribed() {
        const deviceState = await OneSignal.getDeviceState();
        return deviceState?.isSubscribed || false;
    }

    // Prompt for notification permission
    promptPermission() {
        OneSignal.promptForPushNotificationsWithUserResponse();
    }

    // Get notification permission status
    async getPermissionStatus() {
        const deviceState = await OneSignal.getDeviceState();
        return deviceState?.notificationPermissionStatus;
    }

    // Increment session count tag
    async incrementSessionCount() {
        const tags = await OneSignal.getTags();
        const currentCount = parseInt(tags.session_count || '0');
        OneSignal.sendTag('session_count', (currentCount + 1).toString());
    }

    // Track custom events (for analytics)
    sendOutcome(outcomeName, value = null) {
        if (value) {
            OneSignal.sendOutcomeWithValue(outcomeName, value);
        } else {
            OneSignal.sendOutcome(outcomeName);
        }
    }

    // Clear all tags (useful for logout)
    async clearAllTags() {
        const tags = await OneSignal.getTags();
        const tagKeys = Object.keys(tags);
        if (tagKeys.length > 0) {
            OneSignal.deleteTags(tagKeys);
            console.log('✅ OneSignal tags cleared');
        }
    }
}

export default new OneSignalService();
