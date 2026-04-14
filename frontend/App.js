import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform, LogBox, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import * as Sentry from '@sentry/react-native';
import * as Font from 'expo-font';
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons, 
  FontAwesome, 
  Feather 
} from '@expo/vector-icons';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://8fc528bac0775906eb4f09200b90fe2d@o4510752747028480.ingest.de.sentry.io/4510752828293200',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

LogBox.ignoreLogs([
  'Warning: CountryModal: Support for defaultProps will be removed from function components',
]);

export default Sentry.wrap(function App() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ─── OTA Update Check ────────────────────────────────────────────────────────
  // Silently checks for a new JS bundle on every launch.
  // If found: downloads it and reloads the app automatically.
  // Skipped entirely in development mode (Expo Go / dev client).
  useEffect(() => {
    async function checkForOTAUpdate() {
      if (__DEV__) return; // Skip in development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('📦 OTA update available — downloading...');
          await Updates.fetchUpdateAsync();
          console.log('✅ OTA update downloaded — reloading app');
          await Updates.reloadAsync();
        }
      } catch (error) {
        // Non-fatal — user continues with current version
        console.log('ℹ️ OTA check skipped:', error.message);
      }
    }
    checkForOTAUpdate();
  }, []);

  useEffect(() => {
    console.log('🚀 App mounted - Starting initialization');

    // Load fonts

    // Initialize Notifications
    try {
      console.log('🔔 Initializing Push Notifications...');
      // Notification listeners will be set up in AppNavigator (needs navigation ref)
      // Permission requests will be handled after login in authSlice
      console.log('✅ Notification service ready');
    } catch (e) {
      console.log('⚠️ Notification initialization warning:', e);
    }

    // Load fonts
    async function loadFonts() {
      try {
        console.log('🅰️ Loading fonts...');
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...Feather.font,
        });
        console.log('✅ Fonts loaded successfully');
        setFontsLoaded(true);
      } catch (e) {
        console.warn('❌ Error loading fonts', e);
        // Still set to true to avoid getting stuck on splash
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Safety fallback: Force splash screen to hide after 8 seconds max
  // This prevents the app from being stuck on the splash screen if something fails
  useEffect(() => {
    console.log('⏱️ Safety timer effect started');
    const safetyTimer = setTimeout(() => {
      if (!isSplashComplete) {
        console.log('⚠️ Safety timer triggered: Forcing splash screen hide');
        setIsSplashComplete(true);
      }
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [isSplashComplete]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ExpoStatusBar style="light" />
        {!isSplashComplete && (
          <AnimatedSplashScreen
            onAnimationComplete={() => setIsSplashComplete(true)}
            isReady={fontsLoaded}
          />
        )}
        {isSplashComplete && (
          <>
            <AppNavigator />
            <Toast />
          </>
        )}
      </Provider>
    </GestureHandlerRootView>
  );
});