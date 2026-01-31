import React, { useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';

import { loadUser } from '../store/slices/authSlice';
import * as Linking from 'expo-linking';

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
        await dispatch(loadUser()).unwrap();
      } catch (error) {
        // Silently ignore token errors for first-time users
        if (!error.message?.includes('No token found')) {
          console.log('Initialization error:', error.message);
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

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#210059', justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require('../../assets/HashViewSplash.png')}
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
        />
        <ActivityIndicator size="large" color="#ffffff" style={{ position: 'absolute', bottom: 100 }} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={isAuthenticated ? mainLinking : authLinking}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

