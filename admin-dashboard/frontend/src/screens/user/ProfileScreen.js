import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [businessId, setBusinessId] = React.useState(null);
  const [loadingBusiness, setLoadingBusiness] = React.useState(false);

  // Fetch business ID for business owners
  React.useEffect(() => {
    if (user?.role === 'business') {
      fetchBusinessId();
    }
  }, [user]);

  const fetchBusinessId = async () => {
    try {
      setLoadingBusiness(true);
      console.log('🔍 User object for business ID:', JSON.stringify(user, null, 2));

      // Check if already in user object
      if (user?.businesses?.[0]?._id) {
        setBusinessId(user.businesses[0]._id);
        console.log('✅ Business ID from user object:', user.businesses[0]._id);
      } else if (user?.businesses?.[0]) {
        setBusinessId(user.businesses[0]);
        console.log('✅ Business ID from user object (string):', user.businesses[0]);
      } else {
        // Fetch from API if not in user object
        console.log('⚠️  No businesses in user object, fetching from API...');
        const response = await ApiService.getMyBusinesses();
        console.log('📦 API Response:', response);
        if (response.businesses && response.businesses.length > 0) {
          setBusinessId(response.businesses[0]._id);
          console.log('✅ Business ID from API:', response.businesses[0]._id);
        } else {
          console.log('❌ No businesses found - user may need to register business');
        }
      }
    } catch (error) {
      console.error('❌ Failed to get business ID:', error);
    } finally {
      setLoadingBusiness(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logout())
        }
      ]
    );
  };

  // Role-based menu items for better UX
  const getMenuItems = () => {
    const commonItems = [
      {
        title: 'Personal Information',
        icon: 'person-outline',
        onPress: () => navigation.navigate('EditProfile')
      },
      {
        title: 'Notifications',
        icon: 'notifications-outline',
        onPress: () => navigation.navigate('Notifications')
      },
      {
        title: 'Settings',
        icon: 'settings-outline',
        onPress: () => navigation.navigate('Settings')
      },
      {
        title: 'Help & Support',
        icon: 'help-circle-outline',
        onPress: () => navigation.navigate('HelpSupport')
      },
    ];

    // Guest specific menu items
    if (user?.isGuest || user?.role === 'guest') {
      return [
        {
          title: 'Login / Sign Up',
          icon: 'log-in-outline',
          onPress: () => dispatch(logout())
        },
        {
          title: 'Settings',
          icon: 'settings-outline',
          onPress: () => navigation.navigate('Settings')
        },
        {
          title: 'Help & Support',
          icon: 'help-circle-outline',
          onPress: () => navigation.navigate('HelpSupport')
        },
      ];
    }

    // Customer-specific menu items
    if (user?.role === 'customer') {
      return [
        {
          title: 'Personal Information',
          icon: 'person-outline',
          onPress: () => navigation.navigate('EditProfile')
        },
        {
          title: 'My Reviews',
          icon: 'chatbubbles-outline',
          onPress: () => navigation.navigate('History')
        },
        {
          title: 'My Coupons',
          icon: 'gift-outline',
          onPress: () => navigation.navigate('Coupons')
        },
        {
          title: 'Notifications',
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('Notifications')
        },
        {
          title: 'Settings',
          icon: 'settings-outline',
          onPress: () => navigation.navigate('Settings')
        },
        {
          title: 'Help & Support',
          icon: 'help-circle-outline',
          onPress: () => navigation.navigate('HelpSupport')
        },
      ];
    }

    // Business-specific menu items
    if (user?.role === 'business') {
      return [
        {
          title: 'My Business Dashboard',
          icon: 'business-outline',
          onPress: () => navigation.navigate('BusinessDashboard')
        },
        {
          title: 'My Reviews',
          icon: 'star-outline',
          onPress: () => {
            if (businessId) {
              navigation.navigate('ViewReviews', { businessId });
            } else {
              Alert.alert('No Business', 'Please register your business first', [
                { text: 'OK' },
                { text: 'Register', onPress: () => navigation.navigate('BusinessRegistration') }
              ]);
            }
          }
        },
        {
          title: 'My Coupons',
          icon: 'gift-outline',
          onPress: () => {
            if (businessId) {
              navigation.navigate('ManageCouponsNew', { businessId });
            } else {
              Alert.alert('No Business', 'Please register your business first', [
                { text: 'OK' },
                { text: 'Register', onPress: () => navigation.navigate('BusinessRegistration') }
              ]);
            }
          }
        },
        ...commonItems
      ];
    }

    // Admin menu items
    if (user?.role === 'admin') {
      return commonItems;
    }

    // Default fallback
    return commonItems;
  };

  const menuItems = getMenuItems();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-20 px-6"
      >
        <Text className="text-white text-2xl font-bold mb-4">Profile</Text>

        <View className="bg-white rounded-2xl p-6 shadow-lg -mb-16">
          <View className="items-center">
            {user?.profileImage && !user?.isGuest ? (
              <Image
                source={{ uri: user.profileImage }}
                className="w-20 h-20 rounded-full mb-3"
                style={{ borderWidth: 3, borderColor: COLORS.secondary }}
              />
            ) : (
              <View className="w-20 h-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Text className="text-3xl font-bold" style={{ color: COLORS.secondary }}>
                  {user?.name?.charAt(0) || 'G'}
                </Text>
              </View>
            )}
            <Text className="text-xl font-bold text-gray-900">{user?.name || 'Guest User'}</Text>
            <Text className="text-sm text-gray-500 mb-2">{user?.email || 'Sign up to access more features'}</Text>

            <View className="rounded-full px-4 py-2 mt-2" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-sm font-semibold capitalize" style={{ color: COLORS.secondary }}>
                {user?.role || 'Guest'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View className="px-6 mt-20 mb-6">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={item.onPress}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center"
          >
            <View className="w-10 h-10 rounded-full items-center justify-center mr-4" style={{ backgroundColor: '#FFF9F0' }}>
              <Icon name={item.icon} size={20} color={COLORS.secondary} />
            </View>
            <Text className="flex-1 text-base text-gray-900 font-medium">{item.title}</Text>
            <Icon name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        {!user?.isGuest && user?.role !== 'guest' && (
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 rounded-xl p-4 mt-4 shadow-sm flex-row items-center"
          >
            <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
              <Icon name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text className="flex-1 text-base text-red-600 font-semibold">Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="px-6 pb-6">
        <Text className="text-center text-gray-400 text-xs">
          HashView v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

