import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, shallowEqual } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS } from '../config/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// User Screens
import UserHomeScreen from '../screens/user/UserHomeScreen';
import SearchScreen from '../screens/user/SearchScreen';
import AISearchScreen from '../screens/user/AISearchScreen'; // Phase 2: AI-powered search
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
import FavoritesScreen from '../screens/user/FavoritesScreen';
import ClaimBusinessScreen from '../screens/user/ClaimBusinessScreen';
import TermsAndConditionsScreen from '../screens/auth/TermsAndConditionsScreen';
import OrderTrackingScreen from '../screens/user/OrderTrackingScreen';
import InviteFriendsScreen from '../screens/user/InviteFriendsScreen';

// Business Screens
import BusinessDashboardScreen from '../screens/business/BusinessDashboardScreen';
import OrdersDashboardScreen from '../screens/business/OrdersDashboardScreen';
import OrderAnalyticsScreen from '../screens/business/OrderAnalyticsScreen';
import OrderDetailScreen from '../screens/business/OrderDetailScreen';
import OrderInvoiceScreen from '../screens/business/OrderInvoiceScreen';
import TaxManagementScreen from '../screens/business/TaxManagementScreen';
import ChargeManagementScreen from '../screens/business/ChargeManagementScreen';
import KitchenViewScreen from '../screens/business/KitchenViewScreen';
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
import MenuManagementScreen from '../screens/business/MenuManagementScreen'; // Phase 1: AI Menu
import MenuCustomizationScreen from '../screens/business/MenuCustomizationScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// User Stack
function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide navigator header, screens have their own
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
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="ClaimBusiness" component={ClaimBusinessScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="AISearch" component={AISearchScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
    </Stack.Navigator>
  );
}

// Business Stack
function BusinessStack() {
  // Only subscribe to businesses array — NOT the entire user object.
  // This prevents re-render when unrelated fields (like favoritePlaces) change.
  const businesses = useSelector((state) => state.auth.user?.businesses);

  // Check if business exists and KYC status
  // Note: user.businesses is populated by getMe/login endpoints
  const business = businesses && businesses.length > 0 ? businesses[0] : null;

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
      <Stack.Screen name="OrdersDashboard" component={OrdersDashboardScreen} />
      <Stack.Screen name="OrderAnalytics" component={OrderAnalyticsScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="OrderInvoice" component={OrderInvoiceScreen} />
      <Stack.Screen name="TaxManagement" component={TaxManagementScreen} />
      <Stack.Screen name="ChargeManagement" component={ChargeManagementScreen} />
      <Stack.Screen name="KitchenView" component={KitchenViewScreen} />
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
      <Stack.Screen name="MenuManagement" component={MenuManagementScreen} />
      <Stack.Screen name="MenuCustomization" component={MenuCustomizationScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

// Business Profile Stack with navigation screens
function BusinessProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide navigator header, screens have their own
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
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  // Only subscribe to role — prevents re-render on favoritePlaces changes
  const userRole = useSelector((state) => state.auth.user?.role);

  if (userRole === 'business') {
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
          else if (route.name === 'QRScanner')
            return null; // Custom icon for QR Scanner
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60 + Math.max(insets.bottom, 10),
          paddingBottom: Math.max(insets.bottom, 10),
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
        },
      })}
    >
      <Tab.Screen name="Home" component={UserStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: 'Scan',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View
              style={{
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
                borderColor: '#FFF',
              }}
            >
              <Icon name="qr-code" size={32} color="#FFF" />
            </View>
          ),
        }}
      />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
