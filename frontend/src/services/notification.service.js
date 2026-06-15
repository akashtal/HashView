import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import API_CONFIG from '../config/api.config';

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
    this._coldStartHandled = false; // Prevent duplicate cold-start handling
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
   * On iOS, MUST pass explicit options — without them iOS silently ignores the call.
   * On iOS, can only be called once — subsequent calls are no-ops.
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermission() {
    try {
      // Create Android channel first (must exist before any notifications arrive)
      await this.createAndroidChannel();

      // Emulators/Simulators don't support push notifications
      // Use Device.isDevice (expo-device) — more reliable than Constants.isDevice
      if (!Device.isDevice) {
        console.warn('⚠️ [Push] Must use a physical device for push notifications');
        return false;
      }

      console.log(`[Push] Platform: ${Platform.OS} | Requesting permission...`);

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log(`[Push] Current permission status: ${existingStatus}`);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        // ✅ CRITICAL iOS FIX: Must explicitly pass iOS permission options.
        // Without these, iOS silently rejects the request with no prompt shown.
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
          },
        });
        finalStatus = status;
        console.log(`[Push] Permission response: ${status}`);
      }

      if (finalStatus !== 'granted') {
        console.warn(`[Push] ❌ Notification permission denied (${finalStatus})`);
        return false;
      }

      console.log('[Push] ✅ Notification permission granted');
      return true;
    } catch (error) {
      console.error('[Push] ❌ Error requesting notification permission:', error);
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
      console.log(
        `[Push] getExpoPushToken called | Platform: ${Platform.OS} | isDevice: ${Device.isDevice}`
      );

      // Emulators/Simulators can't receive push notifications
      if (!Device.isDevice) {
        console.warn('[Push] ⚠️ Push tokens not available on simulators/emulators');
        return null;
      }

      // Ensure permission first
      const hasPermission = await this.hasPermission();
      console.log(`[Push] Has permission: ${hasPermission}`);

      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.warn('[Push] ❌ Permission not granted — cannot get push token');
          return null;
        }
      }

      // Ensure Android channel exists
      await this.createAndroidChannel();

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('[Push] ❌ EAS project ID not found in app config');
        return null;
      }

      console.log(`[Push] Getting Expo push token for projectId: ${projectId}`);

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log(`[Push] ✅ Expo Push Token (${Platform.OS}):`, token);
      return token;
    } catch (error) {
      console.error('[Push] ❌ Error getting Expo push token:', error.message || error);
      return null;
    }
  }

  /**
   * Set up notification event listeners.
   * ⚠️  MUST be called AFTER NavigationContainer.onReady fires — not before.
   *
   * - Foreground: notification appears as banner, logs payload
   * - Background tap: extracts businessId and navigates to BusinessDetail
   *
   * @param {object} navigation - A ready navigation ref (navigationRef.current)
   */
  setupNotificationListeners(navigation) {
    console.log('[Push] 🔔 Setting up notification listeners...');

    // ── Foreground: notification received while app is open ────────────────
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification?.request?.content?.data || {};
      console.log(
        '[Push] 📬 Notification received (foreground):',
        notification.request.content.title
      );
      console.log('[Push] Foreground payload:', JSON.stringify(data));
    });

    // ── Background/Foreground tap: user tapped the notification ────────────
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push] 👆 Notification tapped by user');
      this.handleNotificationClick(response.notification, navigation);
    });

    console.log('[Push] ✅ Notification listeners initialized');
  }

  /**
   * Handle cold-start: app was launched by tapping a notification while killed.
   * ⚠️  MUST be called AFTER NavigationContainer.onReady fires.
   *
   * @param {object} navigation - A ready navigation ref (navigationRef.current)
   */
  async handleColdStartNotification(navigation) {
    // Guard: only handle once per app session
    if (this._coldStartHandled) return;
    this._coldStartHandled = true;

    try {
      console.log('[Push] 🚀 Checking for cold-start notification...');
      const response = await Notifications.getLastNotificationResponseAsync();

      if (response) {
        console.log(
          '[Push] 🧊 Cold-start notification detected:',
          response.notification?.request?.content?.title
        );
        // Small delay to ensure navigator stack is fully mounted after onReady
        setTimeout(() => {
          this.handleNotificationClick(response.notification, navigation);
        }, 500);
      } else {
        console.log('[Push] ℹ️ No cold-start notification found');
      }
    } catch (error) {
      console.error('[Push] ❌ Cold-start check error:', error.message || error);
    }
  }

  /**
   * Handle notification click/tap — navigate to the correct screen.
   *
   * Navigation hierarchy:
   *   NavigationContainer
   *   └── Stack (Main)
   *       └── Tab (Home)
   *           └── Stack (UserStack)
   *               └── Screen: BusinessDetail   ← target
   *
   * To reach a nested screen we must navigate:
   *   navigate('Home', { screen: 'BusinessDetail', params: { businessId } })
   *
   * @param {object} notification - The Expo notification object
   * @param {object} navigation   - A ready navigation ref
   */
  handleNotificationClick(notification, navigation) {
    try {
      const data = notification?.request?.content?.data || {};

      console.log('[Push] 📲 handleNotificationClick triggered');
      console.log('[Push] Raw data payload:', JSON.stringify(data));

      if (!navigation) {
        console.warn('[Push] ⚠️ Navigation ref not available — cannot redirect');
        return;
      }

      // ── Normalise type to UPPERCASE for reliable comparison ────────────
      const type = (data.type || '').toUpperCase();
      const businessId = data.businessId;
      const orderId = data.orderId;
      const initialTab = data.targetTab || 'updates';

      console.log(`[Push] type="${type}" | businessId="${businessId}" | orderId="${orderId}"`);

      // ── Order: new order received (business owner side) ────────────────
      if (type === 'NEW_ORDER') {
        console.log('[Push] ✅ New order — navigating to OrdersDashboard');
        navigation.navigate('OrdersDashboard');

        // ── Order: status update (customer side) ──────────────────────────
      } else if (type === 'ORDER_STATUS') {
        if (orderId) {
          console.log(
            `[Push] ✅ Order status update — navigating to OrderTracking | orderId=${orderId}`
          );
          navigation.navigate('OrderTracking', { orderId });
        } else {
          navigation.navigate('Home');
        }

        // ── Business update ───────────────────────────────────────────────
      } else if ((type === 'BUSINESS_UPDATE' || type === 'BUSINESS_UPDATES') && businessId) {
        console.log(
          `[Push] ✅ Navigating → Home > BusinessDetail | businessId=${businessId} | tab=${initialTab}`
        );
        navigation.navigate('Home', {
          screen: 'BusinessDetail',
          params: { businessId, initialTab },
        });
      } else if (type === 'ADMIN_BROADCAST') {
        console.log('[Push] 📢 Admin broadcast — navigating to Home');
        navigation.navigate('Home');
      } else if (businessId) {
        // ── Fallback: any notification with a businessId ───────────────
        console.log(`[Push] 🔁 Fallback (unknown type="${type}") — navigating to BusinessDetail`);
        navigation.navigate('Home', {
          screen: 'BusinessDetail',
          params: { businessId, initialTab },
        });
      } else {
        // ── No match → safe fallback to Home ─────────────────────────
        console.log(`[Push] ℹ️ No match (type="${type}") — navigating to Home`);
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('[Push] ❌ Error in handleNotificationClick:', error.message || error);
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
      const endpoint = `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/notifications/register-token`;

      console.log(`📤 Registering push token at: ${endpoint}`);
      console.log(`[Push] Token registration details | platform=${Platform.OS} | token=${token}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          pushToken: token,
          platform: Platform.OS,
          appVersion: Constants.expoConfig?.version || Constants.nativeAppVersion || null,
          deviceId: Constants.sessionId || null,
          installationId: Constants.installationId || null,
        }),
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
