import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Notification Service
 * Handles push notification permissions, tokens, and event listeners
 * Uses Expo Notifications + Firebase Cloud Messaging (FCM)
 */
console.log("Notifications module:", Notifications);

// Configure how notifications should be displayed when app is in foreground
try {
    if (Notifications && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    } else {
        console.warn('⚠️ Notifications module not fully loaded, skipping setNotificationHandler');
    }
} catch (error) {
    console.warn('⚠️ Failed to set notification handler:', error);
}

class NotificationService {
    constructor() {
        this.notificationListener = null;
        this.responseListener = null;
    }

    /**
     * Request notification permissions from the user
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermission() {
        try {
            console.log('📱 Requesting notification permission...');

            // Check if we're on a physical device (not emulator/simulator)
            // Note: Push notifications work on physical devices only
            if (Platform.OS === 'ios' && !Constants.isDevice) {
                console.warn('⚠️ Must use physical device for push notifications');
                return false;
            }

            // Get current permission status
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // If not granted, request permission
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('❌ Notification permission denied');
                return false;
            }

            console.log('✅ Notification permission granted');
            return true;
        } catch (error) {
            console.error('❌ Error requesting notification permission:', error);
            return false;
        }
    }

    /**
     * Check if notification permissions are granted
     * @returns {Promise<boolean>}
     */
    async hasPermission() {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('❌ Error checking notification permission:', error);
            return false;
        }
    }

    /**
     * Get the Expo Push Token for this device
     * @returns {Promise<string|null>} The push token or null if failed
     */
    async getExpoPushToken() {
        try {
            if (Platform.OS === 'ios' && !Constants.isDevice) {
                console.warn('⚠️ Must use physical device for push notifications');
                return null;
            }

            // Ensure we have permission first
            const hasPermission = await this.hasPermission();
            if (!hasPermission) {
                const granted = await this.requestPermission();
                if (!granted) {
                    console.log('❌ Cannot get push token without permission');
                    return null;
                }
            }

            // Get the project ID from app config
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                console.error('❌ EAS project ID not found in app config');
                return null;
            }

            // Get the Expo push token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: projectId,
            });

            const token = tokenData.data;
            console.log('✅ Expo Push Token:', token);
            return token;
        } catch (error) {
            console.error('❌ Error getting Expo push token:', error);
            return null;
        }
    }

    /**
     * Set up notification event listeners
     * - Foreground notifications (app open)
     * - Background/click notifications (app closed/background)
     */
    setupNotificationListeners(navigation) {
        console.log('🔔 Setting up notification listeners...');

        // Listener for notifications received while app is in FOREGROUND
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received (foreground):', notification);
            // Notification is automatically shown by setNotificationHandler
        });

        // Listener for when user TAPS on a notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response);
            this.handleNotificationClick(response.notification, navigation);
        });

        console.log('✅ Notification listeners initialized');
    }

    /**
     * Handle notification click/tap
     * Navigate to appropriate screen based on notification data
     */
    handleNotificationClick(notification, navigation) {
        try {
            const data = notification.request.content.data;
            console.log('📱 Handling notification click with data:', data);

            if (!navigation) {
                console.warn('⚠️ Navigation not available, cannot handle notification click');
                return;
            }

            // Navigate based on notification type
            if (data.type === 'business_update' && data.businessId) {
                // Navigate to business detail
                navigation.navigate('Home', {
                    screen: 'BusinessDetail',
                    params: { businessId: data.businessId }
                });
            } else if (data.type === 'admin_broadcast') {
                // Navigate to home screen
                navigation.navigate('Home');
            } else if (data.screen) {
                // Generic screen navigation
                navigation.navigate(data.screen, data.params || {});
            } else {
                // Default: navigate to home
                navigation.navigate('Home');
            }
        } catch (error) {
            console.error('❌ Error handling notification click:', error);
        }
    }

    /**
     * Clean up notification listeners
     * Call this when unmounting or logging out
     */
    removeNotificationListeners() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
            this.notificationListener = null;
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
            this.responseListener = null;
        }
        console.log('🗑️ Notification listeners removed');
    }

    /**
     * Register push token with backend
     * @param {string} token - The Expo push token
     * @param {string} authToken - The user's auth token
     * @returns {Promise<boolean>} Whether registration was successful
     */
    async registerTokenWithBackend(token, authToken) {
        try {
            // Use the environment variable if available, otherwise fallback to localhost (which fails on physical devices)
            let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || Constants.expoConfig?.extra?.apiBaseUrl || 'https://hashview.44.249.50.162.nip.io';

            // Remove trailing slash if present
            if (API_BASE_URL.endsWith('/')) {
                API_BASE_URL = API_BASE_URL.slice(0, -1);
            }

            // Construct full URL - handle double /api case
            const endpoint = API_BASE_URL.endsWith('/api')
                ? `${API_BASE_URL}/notifications/register-token`
                : `${API_BASE_URL}/api/notifications/register-token`;

            console.log(`📤 Registering push token at: ${endpoint}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ pushToken: token })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Push token registered with backend');
                return true;
            } else {
                console.error('❌ Failed to register push token:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Error registering push token with backend:', error);
            return false;
        }
    }
}

// Export singleton instance
export default new NotificationService();
