import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { logout } from '../../store/slices/authSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function BusinessProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBusinesses();
  }, []);

  const fetchMyBusinesses = async () => {
    try {
      const response = await ApiService.getMyBusinesses();
      setMyBusinesses(response.businesses || []);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
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

  const menuItems = [
    {
      title: 'My Businesses',
      icon: 'business-outline',
      onPress: () => navigation.navigate('BusinessDashboard'),
      description: 'Manage your business listings'
    },
    {
      title: 'Business Analytics',
      icon: 'stats-chart-outline',
      onPress: () => {
        if (myBusinesses.length === 0) {
          Alert.alert(
            'No Business Found',
            'Please register your business first to view analytics.',
            [{ text: 'OK' }]
          );
          return;
        }
        navigation.navigate('BusinessAnalytics', { businessId: myBusinesses[0]._id });
      },
      description: 'View insights and statistics'
    },
    {
      title: 'My Reviews',
      icon: 'chatbubbles-outline',
      onPress: () => {
        if (myBusinesses.length === 0) {
          Alert.alert(
            'No Business Found',
            'Please register your business first to view reviews.',
            [{ text: 'OK' }]
          );
          return;
        }
        navigation.navigate('BusinessReviews', { businessId: myBusinesses[0]._id });
      },
      description: 'Reviews from customers'
    },
    {
      title: 'My Coupons',
      icon: 'gift-outline',
      onPress: () => {
        if (myBusinesses.length === 0) {
          Alert.alert(
            'No Business Found',
            'Please register your business first to manage coupons.',
            [{ text: 'OK' }]
          );
          return;
        }
        navigation.navigate('ManageCouponsNew', { businessId: myBusinesses[0]._id });
      },
      description: 'Create, edit & delete coupons'
    },
    {
      title: 'Account Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('AccountSettings'),
      description: 'Update your profile'
    },
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
      description: 'View all notifications'
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => navigation.navigate('HelpSupport'),
      description: 'Get help and contact us'
    },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-20 px-6"
      >
        <Text className="text-white text-2xl font-bold mb-4">Business Profile</Text>
        
        <View className="bg-white rounded-2xl p-6 shadow-lg -mb-16">
          <View className="items-center">
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                className="w-20 h-20 rounded-full mb-3"
                style={{ borderWidth: 3, borderColor: COLORS.secondary }}
              />
            ) : (
              <View className="w-20 h-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Text className="text-3xl font-bold" style={{ color: COLORS.secondary }}>
                  {user?.name?.charAt(0) || 'B'}
                </Text>
              </View>
            )}
            <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
            <Text className="text-sm text-gray-500 mb-2">{user?.email}</Text>
            
            <View className="rounded-full px-4 py-2 mt-2" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-sm font-semibold capitalize" style={{ color: COLORS.secondary }}>
                Business Owner
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
            <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: '#FFF9F0' }}>
              <Icon name={item.icon} size={22} color={COLORS.secondary} />
            </View>
            <View className="flex-1">
              <Text className="text-base text-gray-900 font-semibold mb-1">{item.title}</Text>
              {item.description && (
                <Text className="text-xs text-gray-500">{item.description}</Text>
              )}
            </View>
            <Icon name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 rounded-xl p-4 mt-4 shadow-sm flex-row items-center"
        >
          <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
            <Icon name="log-out-outline" size={20} color="#EF4444" />
          </View>
          <Text className="flex-1 text-base text-red-600 font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 pb-6">
        <Text className="text-center text-gray-400 text-xs">
          HashView Business v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
