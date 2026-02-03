import OneSignal from 'react-native-onesignal';

class OneSignalService {
    // Get OneSignal Subscription ID (v5 replacement for Player ID)
    async getPlayerId() {
        return OneSignal.User.pushSubscription.getPushSubscriptionId();
    }

    // Set user tags for segmentation
    setUserTags(tags) {
        OneSignal.User.addTags(tags);
        console.log('✅ OneSignal tags set:', tags);
    }

    // Remove user tags
    deleteUserTags(keys) {
        OneSignal.User.removeTags(keys);
    }

    // Get user tags
    async getUserTags() {
        return OneSignal.User.getTags();
    }

    // Set external user ID (your database user ID)
    setExternalUserId(userId) {
        // v5 uses login()
        OneSignal.login(userId.toString());
        console.log('✅ OneSignal external user ID set (login):', userId);
    }

    // Remove external user ID (on logout)
    removeExternalUserId() {
        // v5 uses logout()
        OneSignal.logout();
        console.log('✅ OneSignal logout');
    }

    // Set email for email campaigns
    setEmail(email) {
        OneSignal.User.addEmail(email);
    }

    // Logout email
    logoutEmail() {
        OneSignal.User.removeEmail();
    }

    // Disable/Enable notifications
    disableNotifications() {
        OneSignal.User.pushSubscription.optOut();
    }

    enableNotifications() {
        OneSignal.User.pushSubscription.optIn();
    }

    // Check if user subscribed to notifications
    async isSubscribed() {
        return OneSignal.User.pushSubscription.getOptedIn();
    }

    // Prompt for notification permission
    promptPermission() {
        OneSignal.Notifications.requestPermission(true);
    }

    // Get notification permission status
    async getPermissionStatus() {
        return OneSignal.Notifications.getPermissionStatus();
    }

    // Increment session count tag
    async incrementSessionCount() {
        const tags = await OneSignal.User.getTags();
        const currentCount = parseInt(tags?.session_count || '0');
        OneSignal.User.addTag('session_count', (currentCount + 1).toString());
    }

    // Track custom events (for analytics)
    sendOutcome(outcomeName, value = null) {
        // v5 uses Session.addOutcome
        if (value) {
            OneSignal.Session.addOutcomeWithValue(outcomeName, value);
        } else {
            OneSignal.Session.addOutcome(outcomeName);
        }
    }

    // Clear all tags (useful for logout)
    async clearAllTags() {
        const tags = await OneSignal.User.getTags();
        if (tags) {
            const tagKeys = Object.keys(tags);
            if (tagKeys.length > 0) {
                OneSignal.User.removeTags(tagKeys);
                console.log('✅ OneSignal tags cleared');
            }
        }
    }
}

export default new OneSignalService();
