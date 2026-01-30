import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getDashboardStats();
      setStats(response.stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="flex-1 justify-center items-center"
      >
        <ActivityIndicator size="large" color="#FFF" />
      </LinearGradient>
    );
  }

  // Management cards configuration
  const managementCards = [
    {
      title: 'Categories',
      icon: 'apps',
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      screen: 'CategoryManagement',
      badge: null,
      description: 'Manage app categories'
    },
    {
      title: 'Businesses',
      icon: 'business',
      color: '#F59E0B',
      bgColor: '#FFF7ED',
      screen: 'BusinessManagement',
      badge: stats?.businesses?.pending || 0,
      description: `${stats?.businesses?.total || 0} businesses`
    },
    {
      title: 'Users',
      icon: 'people',
      color: '#10B981',
      bgColor: '#ECFDF5',
      screen: 'UserManagement',
      badge: null,
      description: `${stats?.users?.total || 0} users`
    },
    {
      title: 'Coupons',
      icon: 'pricetag',
      color: '#EC4899',
      bgColor: '#FCE7F3',
      screen: 'AdminCouponManagement',
      badge: null,
      description: `${stats?.coupons?.total || 0} coupons`
    },
    {
      title: 'Reviews',
      icon: 'star',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      screen: 'ReviewManagement',
      badge: null,
      description: `${stats?.reviews?.total || 0} reviews`
    },
    {
      title: 'TripAdvisor',
      icon: 'airplane',
      color: '#00AA6C',
      bgColor: '#E8F5F1',
      screen: 'TripAdvisorManagement',
      badge: null,
      description: 'Manage ratings'
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      screen: 'NotificationManagement',
      badge: null,
      description: 'Send push notifications'
    },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-8 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white text-3xl font-bold">Admin Panel</Text>
            <Text className="text-white/80 text-sm mt-1">Manage your platform</Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Icon name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View className="px-6 py-4">
          {/* Quick Stats Overview */}
          <View className="flex-row flex-wrap justify-between mb-6">
            {/* Users */}
            <View className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="rounded-xl w-12 h-12 items-center justify-center" style={{ backgroundColor: '#ECFDF5' }}>
                  <Icon name="people" size={24} color="#10B981" />
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">{stats?.users?.total || 0}</Text>
                  <Text className="text-xs text-gray-500">Users</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Icon name="trending-up" size={12} color="#10B981" />
                <Text className="text-xs ml-1" style={{ color: '#10B981' }}>
                  +{stats?.users?.newThisMonth || 0} this month
                </Text>
              </View>
            </View>

            {/* Businesses */}
            <View className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="rounded-xl w-12 h-12 items-center justify-center" style={{ backgroundColor: '#FFF7ED' }}>
                  <Icon name="business" size={24} color="#F59E0B" />
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">{stats?.businesses?.total || 0}</Text>
                  <Text className="text-xs text-gray-500">Businesses</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Icon name="trending-up" size={12} color="#F59E0B" />
                <Text className="text-xs ml-1" style={{ color: '#F59E0B' }}>
                  +{stats?.businesses?.newThisMonth || 0} this month
                </Text>
              </View>
            </View>

            {/* Reviews */}
            <View className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="rounded-xl w-12 h-12 items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <Icon name="star" size={24} color="#EF4444" />
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">{stats?.reviews?.total || 0}</Text>
                  <Text className="text-xs text-gray-500">Reviews</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Icon name="chatbubbles" size={12} color="#EF4444" />
                <Text className="text-xs ml-1" style={{ color: '#EF4444' }}>Active ratings</Text>
              </View>
            </View>

            {/* Coupons */}
            <View className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="rounded-xl w-12 h-12 items-center justify-center" style={{ backgroundColor: '#F5F3FF' }}>
                  <Icon name="gift" size={24} color="#8B5CF6" />
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">{stats?.coupons?.total || 0}</Text>
                  <Text className="text-xs text-gray-500">Coupons</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Icon name="pricetag" size={12} color="#8B5CF6" />
                <Text className="text-xs ml-1" style={{ color: '#8B5CF6' }}>Active offers</Text>
              </View>
            </View>
          </View>

          {/* Pending Approvals Alert */}
          {stats?.businesses?.pending > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('BusinessManagement', { filter: 'pending' })}
              className="rounded-2xl p-4 mb-6 flex-row items-center"
              style={{ backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#F59E0B' }}
              activeOpacity={0.7}
            >
              <View className="rounded-full w-14 h-14 items-center justify-center mr-3" style={{ backgroundColor: '#F59E0B' }}>
                <Text className="text-2xl font-bold text-white">{stats.businesses.pending}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">⚠️ Pending Approvals</Text>
                <Text className="text-sm text-gray-600 mt-1">Businesses awaiting verification</Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#F59E0B" />
            </TouchableOpacity>
          )}

          {/* Management Section */}
          <View className="mb-4">
            <Text className="text-xl font-bold text-gray-900 mb-4">Management</Text>
            <View className="flex-row flex-wrap justify-between">
              {managementCards.map((card, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => navigation.navigate(card.screen)}
                  className="bg-white rounded-2xl p-4 shadow-sm w-[48%] mb-3"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="rounded-xl w-14 h-14 items-center justify-center" style={{ backgroundColor: card.bgColor }}>
                      <Icon name={card.icon} size={28} color={card.color} />
                    </View>
                    {card.badge > 0 && (
                      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: card.color }}>
                        <Text className="text-xs font-bold text-white">{card.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-base font-bold text-gray-900 mb-1">{card.title}</Text>
                  <Text className="text-xs text-gray-500">{card.description}</Text>
                  <View className="flex-row items-center mt-3">
                    <Text className="text-xs font-semibold mr-1" style={{ color: card.color }}>Manage</Text>
                    <Icon name="arrow-forward" size={14} color={card.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Platform Health */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">Platform Health</Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center mb-4">
                <Icon name="pulse" size={24} color={COLORS.primary} />
                <Text className="text-base font-semibold text-gray-900 ml-2">Active Businesses</Text>
              </View>
              <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Status</Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {stats?.businesses?.active || 0} / {stats?.businesses?.total || 0}
                  </Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ 
                      width: `${stats?.businesses?.total > 0 ? (stats.businesses.active / stats.businesses.total * 100) : 0}%`,
                      backgroundColor: COLORS.primary
                    }}
                  />
                </View>
              </View>
              <View className="flex-row justify-between pt-4 border-t border-gray-100">
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Active</Text>
                  <Text className="text-xl font-bold" style={{ color: '#10B981' }}>
                    {stats?.businesses?.active || 0}
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Pending</Text>
                  <Text className="text-xl font-bold" style={{ color: '#F59E0B' }}>
                    {stats?.businesses?.pending || 0}
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Total</Text>
                  <Text className="text-xl font-bold" style={{ color: COLORS.primary }}>
                    {stats?.businesses?.total || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

