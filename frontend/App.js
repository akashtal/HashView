import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import { initializeSentry } from './src/config/sentry.config';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Feather } from '@expo/vector-icons';

LogBox.ignoreLogs([
  'Warning: CountryModal: Support for defaultProps will be removed from function components',
]);

export default function App() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    console.log('🚀 App mounted - Starting initialization');

    // Initialize Sentry
    try {
      console.log('🔧 Initializing Sentry...');
      initializeSentry();
      console.log('✅ Sentry initialized (or skipped safely)');
    } catch (e) {
      console.log('⚠️ Sentry initialization warning:', e);
    }

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
}

