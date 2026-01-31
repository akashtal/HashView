import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import { initializeSentry } from './src/config/sentry.config';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome, Feather } from '@expo/vector-icons';
import OneSignal from 'react-native-onesignal';
import Constants from 'expo-constants';

LogBox.ignoreLogs([
  'Warning: CountryModal: Support for defaultProps will be removed from function components',
]);

export default function App() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Initialize Sentry
    initializeSentry();

    // Initialize OneSignal
    const oneSignalAppId = Constants.expoConfig?.extra?.oneSignalAppId;
    // Check if OneSignal is actually available before initializing
    if (oneSignalAppId && OneSignal && typeof OneSignal.setAppId === 'function') {
      try {
        console.log('🔔 Initializing OneSignal with App ID:', oneSignalAppId);

        // Set log level (remove in production)
        OneSignal.setLogLevel(6, 0);

        // Initialize OneSignal
        OneSignal.setAppId(oneSignalAppId);

        // Prompt for push notification permissions
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
          console.log('OneSignal permission response:', response);
        });

        // Handle notification received (foreground)
        OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
          console.log('🔔 OneSignal: notification received in foreground:', notificationReceivedEvent);
          let notification = notificationReceivedEvent.getNotification();
          // Complete with notification means it will show
          notificationReceivedEvent.complete(notification);
        });

        // Handle notification opened/tapped
        OneSignal.setNotificationOpenedHandler(openedEvent => {
          console.log('👆 OneSignal: notification opened:', openedEvent);
          const { action, notification } = openedEvent;
          console.log('Notification data:', notification.additionalData);
          // You can handle navigation here based on notification.additionalData
        });

        // Handle in-app message clicked (optional)
        OneSignal.setInAppMessageClickHandler(event => {
          console.log('OneSignal IAM clicked:', event);
        });

        console.log('✅ OneSignal initialized successfully');
      } catch (error) {
        console.warn('⚠️  OneSignal initialization failed (optional):', error.message);
        // Don't crash the app if OneSignal fails - it's optional
      }
    } else {
      console.warn('⚠️  OneSignal not available - requires rebuild with native code');
    }

    // Load fonts
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...Feather.font,
        });
        console.log('Fonts loaded successfully');
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Error loading fonts', e);
        // Still set to true to avoid getting stuck on splash
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Get status bar height
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

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
            <FlashMessage
              position="top"
              floating={true}
              statusBarHeight={statusBarHeight}
            />
          </>
        )}
      </Provider>
    </GestureHandlerRootView>
  );
}

