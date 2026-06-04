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
import Monitoring from './src/services/monitoring.service';
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

  // Environment tagging — shows prod vs dev errors separately in the dashboard
  environment: __DEV__ ? 'development' : 'production',

  // Attach PII (user email, IP) to errors so you know exactly who was affected
  sendDefaultPii: true,

  // Structured logging forwarded to Sentry
  enableLogs: true,

  // ─── Performance Tracing ─────────────────────────────────────────────────
  // tracesSampleRate: 0.2 means 20% of user sessions are traced end-to-end
  // (frontend button click → API route → database query on the same trace)
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,

  // Distributed tracing: attach Sentry headers to all requests to your API
  // so frontend errors and backend errors are linked on the same trace.
  tracePropagationTargets: [
    'localhost',
    '192.168.',            // LAN dev
    'api.hashview.co.uk',  // Production API
  ],

  // ─── Session Replay ──────────────────────────────────────────────────────
  // replaysSessionSampleRate: record 10% of all sessions as video replays
  // replaysOnErrorSampleRate: record 100% of sessions where an error occurs
  replaysSessionSampleRate: __DEV__ ? 0 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: false,     // keep text visible for debugging
      maskAllImages: false,
    }),
    Sentry.feedbackIntegration(), // shake-to-report bug widget
  ],
});

LogBox.ignoreLogs([
  'Warning: CountryModal: Support for defaultProps will be removed from function components',
]);

export default Sentry.wrap(function App() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ─── OTA Update Check ────────────────────────────────────────────────────────
  // Checks for new JS bundle on every launch.
  // If found: downloads it, sends a local push notification, and prompts restart.
  useEffect(() => {
    async function checkForOTAUpdate() {
      if (__DEV__) return; // Skip in development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('📦 OTA update available — downloading...');
          await Updates.fetchUpdateAsync();
          console.log('✅ OTA update downloaded');

          // Send a local push notification about the update
          try {
            const Notifications = require('expo-notifications');
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '🎉 New Update Available',
                body: 'A new version is available. Check out new features and explore new businesses.',
                sound: 'default',
                data: { type: 'ota_update' },
              },
              trigger: null, // immediate
            });
          } catch (notifErr) {
            console.log('ℹ️ Could not send update notification:', notifErr.message);
          }

          // Show in-app alert prompting restart
          Alert.alert(
            'Update Available',
            'A new version of HashView is ready! Restart now to enjoy the latest features.',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart Now',
                style: 'default',
                onPress: () => Updates.reloadAsync(),
              },
            ]
          );
        }
      } catch (error) {
        // Non-fatal — user continues with current version
        console.log('ℹ️ OTA check skipped:', error.message);
      }
    }
    checkForOTAUpdate();
  }, []);

  useEffect(() => {
    // ─── Initialize Monitoring (PostHog + Firebase) ───────────────────────
    Monitoring.init();
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