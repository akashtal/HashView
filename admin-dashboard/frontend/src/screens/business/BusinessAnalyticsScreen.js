import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

const screenWidth = Dimensions.get('window').width;

export default function BusinessAnalyticsScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBusinessAnalytics(businessId, timeRange);
      setAnalytics(response.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load analytics. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading && !analytics) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="flex-1 text-white text-2xl font-bold">Business Analytics</Text>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row bg-white/20 rounded-xl p-1">
          {['week', 'month', 'year'].map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              className={`flex-1 py-2 rounded-lg ${timeRange === range ? 'bg-white' : ''}`}
            >
              <Text className={`text-center font-semibold capitalize ${
                timeRange === range ? 'text-orange-500' : 'text-white'
              }`}>
                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View className="px-6 mt-6">
          <View className="flex-row flex-wrap justify-between">
            {/* Total Reviews */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ width: '48%' }}>
              <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="star" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {analytics?.totalReviews || 0}
              </Text>
              <Text className="text-sm text-gray-500">Total Reviews</Text>
              <View className="flex-row items-center mt-2">
                <Icon name="trending-up" size={12} color="#10B981" />
                <Text className="text-xs text-green-600 ml-1">
                  +{analytics?.reviewsGrowth || 0}% this {timeRange}
                </Text>
              </View>
            </View>

            {/* Average Rating */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ width: '48%' }}>
              <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="star-half" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {analytics?.averageRating?.toFixed(1) || '0.0'}
              </Text>
              <Text className="text-sm text-gray-500">Avg Rating</Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name={star <= Math.floor(analytics?.averageRating || 0) ? 'star' : 'star-outline'}
                      size={12}
                      color={COLORS.secondary}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Coupons Issued */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ width: '48%' }}>
              <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="gift" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {analytics?.couponsIssued || 0}
              </Text>
              <Text className="text-sm text-gray-500">Coupons Issued</Text>
              <View className="flex-row items-center mt-2">
                <Icon name="checkmark-circle" size={12} color="#10B981" />
                <Text className="text-xs text-green-600 ml-1">
                  {analytics?.couponsRedeemed || 0} redeemed
                </Text>
              </View>
            </View>

            {/* Redemption Rate */}
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ width: '48%' }}>
              <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="trending-up" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {analytics?.redemptionRate || 0}%
              </Text>
              <Text className="text-sm text-gray-500">Redemption Rate</Text>
              <View className="flex-row items-center mt-2">
                <Text className="text-xs text-gray-500">
                  {analytics?.couponsRedeemed || 0} of {analytics?.couponsIssued || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Over Time Chart */}
        {analytics?.reviewsOverTime && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 mb-4">Reviews Over Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: analytics.reviewsOverTime.labels || [],
                    datasets: [{
                      data: analytics.reviewsOverTime.data || [0]
                    }]
                  }}
                  width={Math.max(screenWidth - 80, analytics.reviewsOverTime.labels.length * 50)}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16
                  }}
                />
              </ScrollView>
            </View>
          </View>
        )}

        {/* Rating Distribution */}
        {analytics?.ratingDistribution && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 mb-4">Rating Distribution</Text>
              
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = analytics.ratingDistribution[rating] || 0;
                const total = analytics.totalReviews || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <View key={rating} className="flex-row items-center mb-3">
                    <Text className="text-sm text-gray-700 w-8">{rating}★</Text>
                    <View className="flex-1 h-3 bg-gray-200 rounded-full mx-3 overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS.secondary
                        }}
                      />
                    </View>
                    <Text className="text-sm text-gray-600 w-16 text-right">
                      {count} ({percentage}%)
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Coupon Performance */}
        {analytics?.couponTypes && analytics.couponTypes.length > 0 && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 mb-4">Coupon Performance</Text>
              <BarChart
                data={{
                  labels: analytics.couponTypes.map(c => c.type),
                  datasets: [{
                    data: analytics.couponTypes.map(c => c.count)
                  }]
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
                showValuesOnTopOfBars
              />
            </View>
          </View>
        )}

        {/* Peak Hours */}
        {analytics?.peakHours && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-900 mb-4">Peak Review Hours</Text>
              <BarChart
                data={{
                  labels: analytics.peakHours.labels || [],
                  datasets: [{
                    data: analytics.peakHours.data || [0]
                  }]
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
              />
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View className="px-6 mt-4 mb-6">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-900 mb-4">Quick Stats</Text>
            
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-600">Total Views</Text>
              <Text className="text-lg font-bold text-gray-900">{analytics?.totalViews || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-600">Verified Reviews</Text>
              <Text className="text-lg font-bold text-gray-900">{analytics?.verifiedReviews || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-600">Helpful Votes</Text>
              <Text className="text-lg font-bold text-gray-900">{analytics?.helpfulVotes || 0}</Text>
            </View>

            <View className="flex-row justify-between items-center py-3">
              <Text className="text-gray-600">Response Rate</Text>
              <Text className="text-lg font-bold text-gray-900">{analytics?.responseRate || 0}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
