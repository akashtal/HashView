import React, { useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { loadUser } from '../store/slices/authSlice';
import * as Linking from 'expo-linking';
import NotificationService from '../services/notification.service';

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

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      try {
        // Try to load user, but don't fail if no token exists (first time user)
        const result = await dispatch(loadUser()).unwrap();

        // If user is authenticated, check notification permission
        if (result && result.user && !result.user.isGuest) {
          console.log('✅ User is authenticated, checking notification permission...');

          // Check and request notification permission if needed
          setTimeout(async () => {
            try {
              const NotificationService = require('../services/notification.service').default;
              const hasPermission = await NotificationService.hasPermission();

              if (!hasPermission) {
                console.log('🔔 User is logged in but has not granted notification permission');
                await NotificationService.requestPermission();
              }

              // ALWAYS try to register token on app launch if authenticated
              console.log('🔄 ensuring push token is registered with backend...');
              const token = await NotificationService.getExpoPushToken();
              if (token) {
                // access token from state or store if needed, but the service might need it passed
                // actually, we can get the auth token from the state here
                await NotificationService.registerTokenWithBackend(token, result.token);
              }

            } catch (err) {
              console.log('⚠️ Could not check/request notification permission:', err);
            }
          }, 2000); // Give time for app to initialize
        }
      } catch (error) {
        // Silently ignore token errors for first-time users
        const errorMsg = error?.message || error;
        if (typeof errorMsg === 'string' && errorMsg.includes('No token found')) {
          // Silent
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

  // Setup notification listeners once navigation is ready
  useEffect(() => {
    if (isReady && navigationRef.current) {
      console.log('🔔 Setting up notification listeners with navigation...');
      NotificationService.setupNotificationListeners(navigationRef.current);

      return () => {
        console.log('🗑️ Cleaning up notification listeners...');
        NotificationService.removeNotificationListeners();
      };
    }
  }, [isReady]);

  // Create a navigation ref to pass to notification service
  const navigationRef = React.useRef(null);

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
