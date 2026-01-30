import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ViewReviewsScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState(null);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    fetchReviews();
  }, [filterRating]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = filterRating ? { rating: filterRating } : {};
      const response = await ApiService.getBusinessReviews(businessId, params);
      setReviews(response.reviews || []);
      
      // Calculate stats
      if (response.reviews && response.reviews.length > 0) {
        const total = response.reviews.length;
        const sum = response.reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / total;
        
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        response.reviews.forEach(r => {
          breakdown[r.rating]++;
        });
        
        setStats({ average, total, breakdown });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderReview = ({ item }) => (
    <View className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="font-bold" style={{ color: COLORS.secondary }}>
                {item.user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {item.user?.name || 'Anonymous'}
              </Text>
              <Text className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        <View className="flex-row">
          {[...Array(5)].map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={16}
              color={i < item.rating ? COLORS.secondary : '#E5E7EB'}
            />
          ))}
        </View>
      </View>

      <Text className="text-sm text-gray-700 mb-3">{item.comment}</Text>

      {item.couponAwarded && (
        <View className="flex-row items-center pt-3 border-t border-gray-100">
          <Icon name="gift" size={16} color={COLORS.secondary} />
          <Text className="text-xs ml-2" style={{ color: COLORS.secondary }}>
            Coupon Awarded
          </Text>
        </View>
      )}
    </View>
  );

  const renderRatingBar = (rating) => {
    const count = stats.breakdown[rating] || 0;
    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

    return (
      <TouchableOpacity
        key={rating}
        onPress={() => setFilterRating(filterRating === rating ? null : rating)}
        className="flex-row items-center mb-2"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-gray-700 w-8">{rating}</Text>
        <Icon name="star" size={16} color={COLORS.secondary} />
        <View className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: COLORS.secondary
            }}
          />
        </View>
        <Text className="text-sm text-gray-600 w-8 text-right">{count}</Text>
      </TouchableOpacity>
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
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Customer Reviews</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <ScrollView className="flex-1">
          {/* Stats Summary */}
          <View className="px-6 py-6">
            <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <View className="items-center mb-4">
                <Text className="text-5xl font-bold text-gray-900">
                  {stats.average.toFixed(1)}
                </Text>
                <View className="flex-row mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={20}
                      color={i < Math.round(stats.average) ? COLORS.secondary : '#E5E7EB'}
                    />
                  ))}
                </View>
                <Text className="text-sm text-gray-500 mt-2">
                  Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                </Text>
              </View>

              <View className="border-t border-gray-100 pt-4">
                {[5, 4, 3, 2, 1].map(renderRatingBar)}
              </View>
            </View>

            {/* Filter Indicator */}
            {filterRating && (
              <View className="flex-row items-center justify-between bg-white rounded-xl p-3 mb-4">
                <Text className="text-sm text-gray-700">
                  Showing {filterRating}-star reviews
                </Text>
                <TouchableOpacity onPress={() => setFilterRating(null)}>
                  <Text className="text-sm font-semibold" style={{ color: COLORS.secondary }}>
                    Clear Filter
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <View className="items-center py-20">
                <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-500 mt-4 text-center">
                  {filterRating ? 'No reviews with this rating' : 'No reviews yet'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={reviews}
                renderItem={renderReview}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

