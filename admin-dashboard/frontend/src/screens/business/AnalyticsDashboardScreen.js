import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboardScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    averageRating: 0,
    totalCoupons: 0,
    redeemedCoupons: 0,
    ratingTrend: [],
    recentActivity: []
  });
  const [timeRange, setTimeRange] = useState('week'); // week, month, all

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Fetch business dashboard data
      const response = await ApiService.getBusinessDashboard(businessId);
      
      // Fetch reviews for analytics
      const reviewsResponse = await ApiService.getBusinessReviews(businessId, {});
      
      // Fetch coupons for analytics
      const couponsResponse = await ApiService.getBusinessCoupons(businessId);
      
      // Process data
      const reviews = reviewsResponse.reviews || [];
      const coupons = couponsResponse.coupons || [];
      
      setAnalytics({
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0,
        totalCoupons: coupons.length,
        redeemedCoupons: coupons.filter(c => c.status === 'redeemed').length,
        ratingBreakdown: {
          5: reviews.filter(r => r.rating === 5).length,
          4: reviews.filter(r => r.rating === 4).length,
          3: reviews.filter(r => r.rating === 3).length,
          2: reviews.filter(r => r.rating === 2).length,
          1: reviews.filter(r => r.rating === 1).length,
        },
        recentReviews: reviews.slice(0, 5)
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, title, value, subtitle, color }) => (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
      <View className="flex-row items-center mb-3">
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: color || '#FFF9F0' }}
        >
          <Icon name={icon} size={24} color={COLORS.secondary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-gray-500">{title}</Text>
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          {subtitle && (
            <Text className="text-xs text-gray-400 mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const RatingDistribution = () => (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
      <Text className="text-lg font-bold text-gray-900 mb-4">Rating Distribution</Text>
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = analytics.ratingBreakdown?.[rating] || 0;
        const percentage = analytics.totalReviews > 0 
          ? (count / analytics.totalReviews) * 100 
          : 0;

        return (
          <View key={rating} className="flex-row items-center mb-3">
            <Text className="text-sm text-gray-700 w-8">{rating}</Text>
            <Icon name="star" size={14} color={COLORS.secondary} />
            <View className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: COLORS.secondary
                }}
              />
            </View>
            <Text className="text-sm text-gray-600 w-12 text-right">
              {count} ({percentage.toFixed(0)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );

  const EngagementMetrics = () => {
    const redemptionRate = analytics.totalCoupons > 0 
      ? ((analytics.redeemedCoupons / analytics.totalCoupons) * 100).toFixed(1)
      : 0;

    return (
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <Text className="text-lg font-bold text-gray-900 mb-4">Customer Engagement</Text>
        
        <View className="flex-row justify-between mb-4">
          <View className="flex-1 items-center">
            <Text className="text-3xl font-bold" style={{ color: COLORS.secondary }}>
              {analytics.totalCoupons}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Coupons Issued</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-3xl font-bold" style={{ color: COLORS.primary }}>
              {analytics.redeemedCoupons}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Redeemed</Text>
          </View>
        </View>

        <View className="pt-4 border-t border-gray-100">
          <Text className="text-sm text-gray-600 mb-2">Redemption Rate</Text>
          <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ 
                width: `${redemptionRate}%`,
                backgroundColor: COLORS.secondary
              }}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1">{redemptionRate}%</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Analytics</Text>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row bg-white/20 rounded-xl p-1">
          {['Week', 'Month', 'All'].map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range.toLowerCase())}
              className="flex-1 py-2 rounded-lg"
              style={{ 
                backgroundColor: timeRange === range.toLowerCase() 
                  ? COLORS.secondary 
                  : 'transparent' 
              }}
            >
              <Text
                className="text-center font-semibold text-sm"
                style={{ 
                  color: timeRange === range.toLowerCase() ? '#FFF' : 'rgba(255,255,255,0.8)' 
                }}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-6">
          {/* Key Metrics */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                <Icon name="star" size={24} color={COLORS.secondary} />
                <Text className="text-3xl font-bold text-gray-900 mt-3">
                  {analytics.averageRating.toFixed(1)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">Avg Rating</Text>
              </View>
            </View>
            <View className="flex-1 ml-2">
              <View className="bg-white rounded-2xl p-5 shadow-sm">
                <Icon name="chatbubbles" size={24} color={COLORS.primary} />
                <Text className="text-3xl font-bold text-gray-900 mt-3">
                  {analytics.totalReviews}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">Reviews</Text>
              </View>
            </View>
          </View>

          {/* Rating Distribution */}
          <RatingDistribution />

          {/* Engagement Metrics */}
          <EngagementMetrics />

          {/* Recent Activity */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</Text>
            {analytics.recentReviews && analytics.recentReviews.length > 0 ? (
              analytics.recentReviews.map((review) => (
                <View key={review._id} className="mb-3 pb-3 border-b border-gray-100">
                  <View className="flex-row items-center mb-2">
                    <View className="flex-row">
                      {[...Array(5)].map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={12}
                          color={i < review.rating ? COLORS.secondary : '#E5E7EB'}
                        />
                      ))}
                    </View>
                    <Text className="text-xs text-gray-500 ml-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-700" numberOfLines={2}>
                    {review.comment}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-gray-500 text-center py-4">
                No recent reviews
              </Text>
            )}
          </View>

          {/* Insights */}
          <View className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#FFF9F0' }}>
            <View className="flex-row items-center mb-3">
              <Icon name="bulb" size={24} color={COLORS.secondary} />
              <Text className="text-lg font-bold ml-2" style={{ color: COLORS.secondary }}>
                Insights
              </Text>
            </View>
            <Text className="text-sm text-gray-700 mb-2">
              • Your average rating is {analytics.averageRating >= 4 ? 'excellent' : 'good'}!
            </Text>
            <Text className="text-sm text-gray-700 mb-2">
              • You've received {analytics.totalReviews} reviews total
            </Text>
            <Text className="text-sm text-gray-700">
              • {analytics.redeemedCoupons} out of {analytics.totalCoupons} coupons have been redeemed
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

