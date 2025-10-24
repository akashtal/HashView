import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { useAppDispatch } from '../hooks/useAppDispatch';
import { setCredentials } from '../slices/authSlice';
import socketService from '../services/socketService';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import SearchScreen from '../screens/main/SearchScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Business Screens
import BusinessDetailScreen from '../screens/business/BusinessDetailScreen';
import CreateBusinessScreen from '../screens/business/CreateBusinessScreen';
import EditBusinessScreen from '../screens/business/EditBusinessScreen';

// Chat Screens
import ConversationScreen from '../screens/chat/ConversationScreen';
import CreateConversationScreen from '../screens/chat/CreateConversationScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useSelector(state => state.ui);
  const { unreadCount } = useSelector(state => state.chat);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ 
          title: 'Chat',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function BusinessStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="BusinessDetail" 
        component={BusinessDetailScreen}
        options={{ title: 'Business Details' }}
      />
      <Stack.Screen 
        name="CreateBusiness" 
        component={CreateBusinessScreen}
        options={{ title: 'Create Business' }}
      />
      <Stack.Screen 
        name="EditBusiness" 
        component={EditBusinessScreen}
        options={{ title: 'Edit Business' }}
      />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Conversation" 
        component={ConversationScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen 
        name="CreateConversation" 
        component={CreateConversationScreen}
        options={{ title: 'New Chat' }}
      />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen}
        options={{ title: 'Admin Dashboard' }}
      />
    </Stack.Navigator>
  );
}

function MainDrawer() {
  const { user } = useSelector(state => state.auth);

  return (
    <Drawer.Navigator>
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ title: 'Hash View' }}
      />
      <Drawer.Screen 
        name="BusinessStack" 
        component={BusinessStack}
        options={{ title: 'Business' }}
      />
      <Drawer.Screen 
        name="ChatStack" 
        component={ChatStack}
        options={{ title: 'Messages' }}
      />
      {user?.role === 'admin' && (
        <Drawer.Screen 
          name="AdminStack" 
          component={AdminStack}
          options={{ title: 'Admin' }}
        />
      )}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Check for stored credentials on app start
    // This would typically be handled by redux-persist
    // For now, we'll assume the user is not authenticated
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to socket when user is authenticated
      socketService.connect(user.accessToken);
    } else {
      // Disconnect socket when user is not authenticated
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Role-based navigation
  if (user?.role === 'admin') {
    return <AdminStack />;
  }

  return <MainDrawer />;
}
