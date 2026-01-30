import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../config/colors';

// User Screens
import UserHomeScreen from '../screens/user/UserHomeScreen';
import SearchScreen from '../screens/user/SearchScreen';
import HistoryScreen from '../screens/user/HistoryScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import BusinessDetailScreen from '../screens/user/BusinessDetailScreen';
import AddReviewScreen from '../screens/user/AddReviewScreen';
import CouponsScreen from '../screens/user/CouponsScreen';
import QRScannerScreen from '../screens/user/QRScannerScreen';
import SettingsScreen from '../screens/user/SettingsScreen';
import EditProfileScreen from '../screens/user/EditProfileScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import HelpSupportScreen from '../screens/user/HelpSupportScreen';
import AccountSettingsScreen from '../screens/user/AccountSettingsScreen';
import ChangePasswordScreen from '../screens/user/ChangePasswordScreen';
import DeleteAccountScreen from '../screens/user/DeleteAccountScreen';
import VerifyEmailScreen from '../screens/user/VerifyEmailScreen';

// Business Screens
import BusinessDashboardScreen from '../screens/business/BusinessDashboardScreen';
import BusinessRegistrationScreen from '../screens/business/BusinessRegistrationScreen';
import BusinessKYCScreen from '../screens/business/BusinessKYCScreen';

import ManageCouponsScreen from '../screens/business/ManageCouponsScreen';
import ManageUpdatesScreen from '../screens/business/ManageUpdatesScreen';
import ViewReviewsScreen from '../screens/business/ViewReviewsScreen';
import AnalyticsDashboardScreen from '../screens/business/AnalyticsDashboardScreen';
import EditBusinessInfoScreen from '../screens/business/EditBusinessInfoScreen';
import BusinessProfileScreen from '../screens/business/BusinessProfileScreen';
import BusinessReviewsScreen from '../screens/business/BusinessReviewsScreen';
import BusinessAnalyticsScreen from '../screens/business/BusinessAnalyticsScreen';
import CouponManagementScreen from '../screens/business/CouponManagementScreen';
import ManageCouponsNew from '../screens/business/ManageCouponsNew';
import CouponQRScannerScreen from '../screens/business/CouponQRScannerScreen';

// Admin Screens - Full Management
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import CategoryManagementScreen from '../screens/admin/CategoryManagementScreen';
import BusinessManagementScreen from '../screens/admin/BusinessManagementScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ReviewManagementScreen from '../screens/admin/ReviewManagementScreen';
import AdminCouponManagementScreen from '../screens/admin/AdminCouponManagementScreen';
import TripAdvisorManagementScreen from '../screens/admin/TripAdvisorManagementScreen';
import NotificationManagementScreen from '../screens/admin/NotificationManagementScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// User Stack
function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,  // Hide navigator header, screens have their own
      }}
    >
      <Stack.Screen name="UserHome" component={UserHomeScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <Stack.Screen name="AddReview" component={AddReviewScreen} />
      <Stack.Screen name="Coupons" component={CouponsScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}

// Business Stack
function BusinessStack() {
  const { user } = useSelector((state) => state.auth);

  // Check if business exists and KYC status
  // Note: user.businesses is populated by getMe/login endpoints
  const business = user?.businesses && user.businesses.length > 0 ? user.businesses[0] : null;

  // KYC Status Check
  // Default to pending if not set
  const kycStatus = business?.kycStatus || 'pending';

  // Allowed statuses to access dashboard
  const isKYCComplete = ['in_review', 'verified', 'approved'].includes(kycStatus);

  // Scenario 1: No Business Registered -> Force Registration
  if (!business) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="BusinessRegistration" component={BusinessRegistrationScreen} />
        {/* Fallback routes usually not needed here but kept for transition safety */}
        <Stack.Screen name="BusinessKYC" component={BusinessKYCScreen} />
      </Stack.Navigator>
    );
  }

  // Scenario 2: Business Exists but KYC Incomplete -> Force KYC
  if (!isKYCComplete) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="BusinessKYC"
          component={BusinessKYCScreen}
          initialParams={{ businessId: business._id }}
        />
      </Stack.Navigator>
    );
  }

  // Scenario 3: KYC Complete -> Full Dashboard Access
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="BusinessDashboard" component={BusinessDashboardScreen} />
      <Stack.Screen name="BusinessRegistration" component={BusinessRegistrationScreen} />
      <Stack.Screen name="BusinessKYC" component={BusinessKYCScreen} />

      <Stack.Screen name="ManageCoupons" component={ManageCouponsScreen} />
      <Stack.Screen name="ManageUpdates" component={ManageUpdatesScreen} />
      <Stack.Screen name="ViewReviews" component={ViewReviewsScreen} />
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
      <Stack.Screen name="EditBusinessInfo" component={EditBusinessInfoScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="BusinessReviews" component={BusinessReviewsScreen} />
      <Stack.Screen name="BusinessAnalytics" component={BusinessAnalyticsScreen} />
      <Stack.Screen name="CouponManagement" component={CouponManagementScreen} />
      <Stack.Screen name="ManageCouponsNew" component={ManageCouponsNew} />
      <Stack.Screen name="CouponQRScanner" component={CouponQRScannerScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}

// No separate admin stack needed - admins just see analytics + profile

export default function MainNavigator() {
  const { user } = useSelector((state) => state.auth);

  // Admin Stack with navigation screens
  function AdminDashboardStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="DashboardHome" component={AdminDashboardScreen} />
        <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
        <Stack.Screen name="BusinessManagement" component={BusinessManagementScreen} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        <Stack.Screen name="AdminCouponManagement" component={AdminCouponManagementScreen} />
        <Stack.Screen name="ReviewManagement" component={ReviewManagementScreen} />
        <Stack.Screen name="TripAdvisorManagement" component={TripAdvisorManagementScreen} />
        <Stack.Screen name="NotificationManagement" component={NotificationManagementScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      </Stack.Navigator>
    );
  }

  function AdminProfileStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,  // Hide navigator header, screens have their own
        }}
      >
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      </Stack.Navigator>
    );
  }

  if (user?.role === 'admin') {
    // Admin has full management capabilities
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={AdminDashboardStack}
          options={{ title: 'Admin Panel' }}
        />
        <Tab.Screen
          name="Profile"
          component={AdminProfileStack}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    );
  }

  // Business Profile Stack with navigation screens
  function BusinessProfileStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,  // Hide navigator header, screens have their own
        }}
      >
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      </Stack.Navigator>
    );
  }

  if (user?.role === 'business') {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Business') iconName = focused ? 'business' : 'business-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Business" component={BusinessStack} />
        <Tab.Screen name="Profile" component={BusinessProfileStack} />
      </Tab.Navigator>
    );
  }

  // Customer role (default)
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'QRScanner') return null; // Custom icon for QR Scanner
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={UserStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: 'Scan',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={{
              position: 'absolute',
              top: -25,
              width: 65,
              height: 65,
              borderRadius: 33,
              backgroundColor: COLORS.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: COLORS.secondary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 5,
              borderColor: '#FFF'
            }}>
              <Icon name="qr-code" size={32} color="#FFF" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

