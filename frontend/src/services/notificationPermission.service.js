import { Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

// Import OneSignal dynamically to avoid initialization issues
let OneSignal = null;

class NotificationPermissionHelper {
    constructor() {
        // Lazy load OneSignal when needed
        try {
            OneSignal = require('react-native-onesignal');
            console.log('✅ OneSignal module loaded successfully');
        } catch (err) {
            console.error('❌ OneSignal module not available:', err);
        }
    }

    /**
     * Request notification permission from the user
     * This should be called AFTER user login
     */
    async requestPermission() {
        try {
            console.log('📱 Requesting notification permission...');

            // Check if OneSignal is available
            if (!OneSignal) {
                console.error('❌ OneSignal is not available');
                return false;
            }

            // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS permission
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                console.log('📱 Android 13+ detected, requesting POST_NOTIFICATIONS...');
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Enable Notifications',
                        message: 'Allow HashView to send you important updates and offers?',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Not Now',
                    }
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('✅ Android POST_NOTIFICATIONS permission granted');
                } else {
                    console.log('❌ Android POST_NOTIFICATIONS permission denied');
                    return false;
                }
            }

            // Request OneSignal permission (works for both iOS and Android)
            console.log('🔔 Attempting OneSignal permission request...');

            // Check if Notifications API is available
            if (!OneSignal.Notifications) {
                console.log('⚠️ OneSignal.Notifications namespace is not available yet');
                console.log('✅ Using Android system permission only');
                // If we already granted Android permission, that's good enough
                return Platform.OS === 'android' && Platform.Version >= 33;
            }

            // Try to request permission via OneSignal
            try {
                if (typeof OneSignal.Notifications.requestPermission === 'function') {
                    const hasPermission = await OneSignal.Notifications.requestPermission(true);
                    console.log('OneSignal permission status:', hasPermission);

                    if (hasPermission) {
                        console.log('✅ Push notifications enabled successfully');

                        // Additional verification - check if user is opted in
                        try {
                            if (OneSignal.User && OneSignal.User.pushSubscription) {
                                const optedIn = await OneSignal.User.pushSubscription.getOptedIn();
                                console.log('User opted in status:', optedIn);

                                if (!optedIn) {
                                    console.log('🔄 User not opted in, attempting to opt in...');
                                    await OneSignal.User.pushSubscription.optIn();
                                }
                            }
                        } catch (err) {
                            console.log('⚠️ Could not verify opt-in status:', err);
                        }

                        return true;
                    } else {
                        console.log('❌ Push notifications permission denied');
                        return false;
                    }
                } else {
                    console.log('⚠️ OneSignal.Notifications.requestPermission not available');
                    // Fall back to Android permission success
                    return Platform.OS === 'android' && Platform.Version >= 33;
                }
            } catch (err) {
                console.log('⚠️ Error calling OneSignal.Notifications.requestPermission:', err);
                // If Android permission was granted, still consider it partial success
                return Platform.OS === 'android' && Platform.Version >= 33;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    /**
     * Check if notification permission is already granted
     */
    async hasPermission() {
        try {
            // First check Android system permission (for Android 13+)
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );

                if (!granted) {
                    console.log('Android POST_NOTIFICATIONS not granted');
                    return false;
                }
            }

            if (!OneSignal || !OneSignal.Notifications) {
                // If OneSignal not ready, but Android permission is granted
                return Platform.OS === 'android' && Platform.Version >= 33;
            }

            // Try to get OneSignal permission status
            if (typeof OneSignal.Notifications.getPermissionAsync === 'function') {
                const permissionStatus = await OneSignal.Notifications.getPermissionAsync();
                console.log('Current OneSignal permission status:', permissionStatus);
                return permissionStatus === true;
            }

            // Fallback: assume permission if Android permission is granted
            return Platform.OS === 'android' && Platform.Version >= 33;
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    /**
     * Check if user is subscribed to push notifications
     */
    async isSubscribed() {
        try {
            if (!OneSignal || !OneSignal.User || !OneSignal.User.pushSubscription) {
                return false;
            }

            const optedIn = await OneSignal.User.pushSubscription.getOptedIn();
            console.log('User opted in to push:', optedIn);
            return optedIn;
        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }
    }
}

export default new NotificationPermissionHelper();
