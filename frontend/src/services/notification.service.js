import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';

/**
 * Notification Service
 * Handles push notification permissions, tokens, channels, and event listeners.
 * Uses Expo Notifications → routes through FCM (Android) and APNs (iOS).
 */

// ── Configure foreground notification display ────────────────────────────────
try {
    if (Notifications && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    }
} catch (error) {
    console.warn('⚠️ Failed to set notification handler:', error);
}

class NotificationService {
    constructor() {
        this.notificationListener = null;
        this.responseListener = null;
        this._channelCreated = false;
    }

    /**
     * Create Android notification channel (REQUIRED for Android 8+).
     * Without this, Android silently drops ALL push notifications.
     * Safe to call multiple times — Expo deduplicates by channelId.
     */
    async createAndroidChannel() {
        if (Platform.OS !== 'android' || this._channelCreated) return;

        try {
            await Notifications.setNotificationChannelAsync('hashview-updates', {
                name: 'Offers & Updates',
                description: 'Notifications for business offers, updates and announcements',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#210059',
                sound: 'default',
                enableLights: true,
                enableVibrate: true,
                showBadge: true,
            });
            this._channelCreated = true;
            console.log('✅ Android notification channel "hashview-updates" created');
        } catch (error) {
            console.warn('⚠️ Failed to create Android notification channel:', error);
        }
    }

    /**
     * Request notification permissions from the user.
     * On iOS, can only be called once — subsequent calls are no-ops.
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermission() {
        try {
            // Create Android channel first (must exist before any notifications arrive)
            await this.createAndroidChannel();

            // Simulators don't support push
            if (Platform.OS === 'ios' && !Constants.isDevice) {
                console.warn('⚠️ Must use physical device for push notifications');
                return false;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

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
     * Check if notification permissions are currently granted.
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
     * Check if permission was permanently denied (user must go to Settings).
     * @returns {Promise<boolean>} true if denied and can't ask again
     */
    async isPermissionDenied() {
        try {
            const settings = await Notifications.getPermissionsAsync();
            // On iOS: if status is 'denied', system won't show the prompt again
            // On Android: if canAskAgain is false, user selected "Don't ask again"
            if (settings.status === 'denied') {
                return !settings.canAskAgain;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Open the device's Settings page for this app (so user can enable notifications).
     */
    async openNotificationSettings() {
        try {
            if (Platform.OS === 'ios') {
                await Linking.openURL('app-settings:');
            } else {
                await Linking.openSettings();
            }
        } catch (error) {
            console.error('❌ Could not open settings:', error);
        }
    }

    /**
     * Get the Expo Push Token for this device.
     * @returns {Promise<string|null>} The push token or null if failed
     */
    async getExpoPushToken() {
        try {
            if (Platform.OS === 'ios' && !Constants.isDevice) {
                return null;
            }

            // Ensure permission first
            const hasPermission = await this.hasPermission();
            if (!hasPermission) {
                const granted = await this.requestPermission();
                if (!granted) {
                    return null;
                }
            }

            // Ensure Android channel exists
            await this.createAndroidChannel();

            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
                console.error('❌ EAS project ID not found in app config');
                return null;
            }

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
     * Set up notification event listeners.
     * - Foreground: notification appears as banner
     * - Background tap: navigates to relevant screen
     */
    setupNotificationListeners(navigation) {
        console.log('🔔 Setting up notification listeners...');

        // Foreground notifications
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received (foreground):', notification.request.content.title);
        });

        // Notification tap handler
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped');
            this.handleNotificationClick(response.notification, navigation);
        });

        // Check if app was opened from a notification (cold start)
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (response) {
                console.log('🚀 App opened from notification (cold start)');
                this.handleNotificationClick(response.notification, navigation);
            }
        });

        console.log('✅ Notification listeners initialized');
    }

    /**
     * Handle notification click/tap — navigate to relevant screen.
     */
    handleNotificationClick(notification, navigation) {
        try {
            const data = notification.request.content.data;

            if (!navigation) {
                console.warn('⚠️ Navigation not available');
                return;
            }

            if (data.type === 'business_update' && data.businessId) {
                navigation.navigate('Home', {
                    screen: 'BusinessDetail',
                    params: { businessId: data.businessId }
                });
            } else if (data.type === 'admin_broadcast') {
                navigation.navigate('Home');
            } else if (data.screen) {
                navigation.navigate(data.screen, data.params || {});
            } else {
                navigation.navigate('Home');
            }
        } catch (error) {
            console.error('❌ Error handling notification click:', error);
        }
    }

    /**
     * Clean up notification listeners.
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
    }

    /**
     * Register push token with backend.
     * @param {string} token - The Expo push token
     * @param {string} authToken - The user's JWT auth token
     * @returns {Promise<boolean>} Whether registration was successful
     */
    async registerTokenWithBackend(token, authToken) {
        try {
            let API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || Constants.expoConfig?.extra?.apiBaseUrl || 'https://hashview.44.249.50.162.nip.io';

            if (API_BASE_URL.endsWith('/')) {
                API_BASE_URL = API_BASE_URL.slice(0, -1);
            }

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
