import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadUser } from '../store/slices/authSlice';
import * as Linking from 'expo-linking';
import NotificationService from '../services/notification.service';
import NotificationPermissionBanner from '../components/NotificationPermissionBanner';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';



const Stack = createStackNavigator();

// Deep Linking Configuration
const prefixes = [Linking.createURL('/'), 'hashview://'];

const mainLinking = {
  prefixes,
  config: {
    screens: {
      // Main App (Authenticated) via Tab Navigator
      // The path maps 'business/:id' to the BusinessDetail screen inside the Home tab
      Home: {
        screens: {
          BusinessDetail: 'business/:businessId',
        }
      },
    }
  }
};

const authLinking = {
  prefixes,
  config: {
    screens: {
      // Auth Stack (Unauthenticated)
      Login: 'login',
      BusinessDetail: 'business/:businessId', // Direct route in AuthStack
    }
  }
};

/**
 * Register push token with backend — with retry logic.
 * Called on login, app launch, and app foreground.
 */
async function ensurePushTokenRegistered(authToken) {
  try {
    // Create Android channel first (must exist before notifications arrive)
    await NotificationService.createAndroidChannel();

    const token = await NotificationService.getExpoPushToken();
    if (token && authToken) {
      await NotificationService.registerTokenWithBackend(token, authToken);
    }
  } catch (err) {
    console.log('⚠️ Push token registration failed:', err.message || err);
  }
}

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const [isReady, setIsReady] = React.useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const authTokenRef = React.useRef(null);

  // Create a navigation ref to pass to notification service
  const navigationRef = React.useRef(null);

  useEffect(() => {
    authTokenRef.current = token;
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      try {
        // ✅ REQUEST PERMISSION EARLY — before we even know if the user is logged in.
        // On iOS, the permission prompt must be triggered as early as possible.
        // This ensures first-time users see the prompt even before logging in.
        const hasPermission = await NotificationService.hasPermission();
        if (!hasPermission) {
          console.log('[Push] Requesting permission early (pre-login)...');
          await NotificationService.requestPermission();
        }

        const result = await dispatch(loadUser()).unwrap();

        if (result && result.user && !result.user.isGuest) {
          authTokenRef.current = result.token;

          // Register token with backend
          await ensurePushTokenRegistered(result.token);

          // Show banner if permanently denied
          const denied = await NotificationService.isPermissionDenied();
          if (denied && isMounted) {
            setShowPermissionBanner(true);
          }
        }
      } catch (error) {
        const errorMsg = error?.message || error;
        if (typeof errorMsg === 'string' && errorMsg.includes('No token found')) {
          // Silent — first time user
        } else {
          console.log('User load error:', error);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  // ── Re-register push token when app comes to foreground ──────────────────
  // Tokens can change at any time (OS refresh, reinstall). Re-registering
  // on every foreground event ensures the backend always has the latest token.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && authTokenRef.current) {
        // Re-register token silently
        await ensurePushTokenRegistered(authTokenRef.current);

        // Re-check permission status for banner
        const hasPermission = await NotificationService.hasPermission();
        if (!hasPermission) {
          const denied = await NotificationService.isPermissionDenied();
          setShowPermissionBanner(denied);
        } else {
          setShowPermissionBanner(false);
        }
      }
    });

    return () => subscription?.remove();
  }, []);

  // ── Register token when user logs in (isAuthenticated changes to true) ──────
  // Handles case where user was NOT logged in on first launch (permission prompt
  // appeared pre-login) — after they log in, register their token immediately.
  useEffect(() => {
    if (isAuthenticated && token) {
      authTokenRef.current = token;
      ensurePushTokenRegistered(token);
    }
  }, [isAuthenticated, token]);

  // ── Setup notification listeners once navigation is ready ─────────────────
  useEffect(() => {
    if (isReady && navigationRef.current) {
      NotificationService.setupNotificationListeners(navigationRef.current);

      return () => {
        NotificationService.removeNotificationListeners();
      };
    }
  }, [isReady]);

  // Show loading screen while checking auth
  if (!isReady || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#210059', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }


  const linking = isAuthenticated ? mainLinking : authLinking;

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {/* Show permission banner when notification permission is denied */}
      {isAuthenticated && showPermissionBanner && (
        <NotificationPermissionBanner
          onDismiss={() => setShowPermissionBanner(false)}
          onOpenSettings={() => NotificationService.openNotificationSettings()}
        />
      )}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
