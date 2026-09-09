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
import ReferralService from '../services/referral.service';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import HelpSupportScreen from '../screens/user/HelpSupportScreen';
import CartScreen from '../screens/user/CartScreen';
import CheckoutScreen from '../screens/user/CheckoutScreen';

// --- Phase 5: Order Management ---
import OrdersDashboardScreen from '../screens/business/OrdersDashboardScreen';
import OrderDetailScreen from '../screens/business/OrderDetailScreen';
import KitchenViewScreen from '../screens/business/KitchenViewScreen';
import OrderTrackingScreen from '../screens/user/OrderTrackingScreen';

const Stack = createStackNavigator();

// Deep Linking Configuration
const prefixes = [
  Linking.createURL('/'),
  'hashview://',
  'https://hashview.co.uk',
  'https://www.hashview.co.uk',
];

const mainLinking = {
  prefixes,
  config: {
    screens: {
      // Main App (Authenticated) via Tab Navigator
      // The path maps 'business/:id' to the BusinessDetail screen inside the Home tab
      Home: {
        screens: {
          BusinessDetail: {
            path: 'business/:businessId/:section?',
          },
          InviteFriends: {
            path: 'invite/:code',
          },
        },
      },
    },
  },
};

const authLinking = {
  prefixes,
  config: {
    screens: {
      // Auth Stack (Unauthenticated)
      Login: 'login',
      BusinessDetail: {
        path: 'business/:businessId/:section?',
      },
    },
  },
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

    // ── Deep link: capture referral code on cold start ──────────────────────
    // When the app is opened via https://hashview.app/invite/CODE (not installed)
    // or hashview://invite/CODE (installed), we capture and store the code so
    // the registration screen can pre-fill it automatically.
    const handleReferralUrl = (url) => {
      if (!url) return;
      const code = ReferralService.extractCodeFromUrl(url);
      if (code) {
        console.log('[Referral] Deep link detected — storing code:', code);
        ReferralService.storePendingCode(code);
      }
    };

    // Check initial URL (cold start / killed)
    Linking.getInitialURL().then(handleReferralUrl).catch(() => {});

    // Also listen for URLs while app is in background/foreground
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleReferralUrl(url));

    return () => {
      isMounted = false;
      linkingSub?.remove();
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

  // ── Navigate directly to Login after guest logout ─────────────────────────
  // When a guest user taps "Login" on the search wall, we:
  //   1. Set a flag in AsyncStorage
  //   2. dispatch(logout()) — this causes isAuthenticated to become false
  //   3. AppNavigator switches to AuthNavigator (initial: RoleSelection)
  //   4. This effect detects the flag and navigates directly to Login,
  //      bypassing the RoleSelection screen entirely.
  const prevIsAuthenticated = React.useRef(isAuthenticated);
  useEffect(() => {
    // Only fire when transitioning FROM authenticated TO unauthenticated
    if (prevIsAuthenticated.current && !isAuthenticated && isReady) {
      (async () => {
        try {
          const flag = await AsyncStorage.getItem('directLoginAfterGuest');
          if (flag === '1') {
            await AsyncStorage.removeItem('directLoginAfterGuest');
            // Small delay to let AuthNavigator fully mount before navigating
            setTimeout(() => {
              navigationRef.current?.navigate('Login');
            }, 150);
          }
        } catch {
          /* non-fatal */
        }
      })();
    }
    prevIsAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isReady]);

  // ── Cleanup notification listeners on unmount ────────────────────────────
  // Listeners are SET UP inside NavigationContainer.onReady (below) to guarantee
  // the navigator is fully mounted before any navigation attempt is made.
  useEffect(() => {
    return () => {
      NotificationService.removeNotificationListeners();
    };
  }, []);

  // Show loading screen while checking auth
  if (!isReady || loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#210059',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const linking = isAuthenticated ? mainLinking : authLinking;

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        // ✅ NavigationContainer is GUARANTEED ready here — safe to navigate.
        // Set up foreground + background tap listeners.
        console.log('[Push] 🗺️ NavigationContainer ready — initializing notification listeners');
        NotificationService.setupNotificationListeners(navigationRef.current);
        // Handle cold-start: app opened by tapping a notification while killed.
        NotificationService.handleColdStartNotification(navigationRef.current);
      }}
    >
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
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrdersDashboard" component={OrdersDashboardScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="KitchenView" component={KitchenViewScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen
          name="TaxManagement"
          component={require('../screens/business/TaxManagementScreen').default}
        />
        <Stack.Screen
          name="ChargeManagement"
          component={require('../screens/business/ChargeManagementScreen').default}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
