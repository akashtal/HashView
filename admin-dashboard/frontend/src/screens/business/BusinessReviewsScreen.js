import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function BusinessReviewsScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, approved

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBusinessReviews(businessId);
      let filteredReviews = response.reviews || [];
      
      if (filter !== 'all') {
        filteredReviews = filteredReviews.filter(r => r.status === filter);
      }
      
      setReviews(filteredReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? COLORS.secondary : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  const renderReview = (review) => {
    return (
      <View key={review._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        {/* User Info */}
        <View className="flex-row items-center mb-3">
          {review.user?.profileImage ? (
            <Image
              source={{ uri: review.user.profileImage }}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-lg font-bold" style={{ color: COLORS.secondary }}>
                {review.user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
          
          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900">{review.user?.name || 'Anonymous'}</Text>
              <View className={`px-3 py-1 rounded-full ${
                review.status === 'approved' ? 'bg-green-100' : 
                review.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Text className={`text-xs font-semibold capitalize ${
                  review.status === 'approved' ? 'text-green-700' : 
                  review.status === 'pending' ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {review.status}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-gray-500 mt-1">
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <View className="flex-row items-center mb-3">
          {renderStars(review.rating)}
          <Text className="text-sm text-gray-600 ml-2 font-semibold">
            {review.rating}.0
          </Text>
        </View>

        {/* Comment */}
        {review.comment && (
          <Text className="text-sm text-gray-700 mb-3 leading-5">
            {review.comment}
          </Text>
        )}

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {review.images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                className="w-20 h-20 rounded-lg mr-2"
              />
            ))}
          </ScrollView>
        )}

        {/* Meta Info */}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            {review.verified && (
              <View className="flex-row items-center mr-4">
                <Icon name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-xs text-green-600 ml-1">Verified</Text>
              </View>
            )}
            {review.couponAwarded && (
              <View className="flex-row items-center">
                <Icon name="gift" size={16} color={COLORS.secondary} />
                <Text className="text-xs ml-1" style={{ color: COLORS.secondary }}>Coupon Given</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center">
            <Icon name="thumbs-up-outline" size={14} color="#6B7280" />
            <Text className="text-xs text-gray-600 ml-1">
              {review.helpfulCount || 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
          <Text className="flex-1 text-white text-2xl font-bold">My Reviews</Text>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-white/20 rounded-xl p-1">
          {['all', 'approved', 'pending'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilter(status)}
              className={`flex-1 py-2 rounded-lg ${filter === status ? 'bg-white' : ''}`}
            >
              <Text className={`text-center font-semibold capitalize ${
                filter === status ? 'text-orange-500' : 'text-white'
              }`}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Reviews List */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reviews.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#FFF9F0' }}>
              <Icon name="chatbubbles-outline" size={48} color={COLORS.secondary} />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">No Reviews Yet</Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              {filter === 'all' 
                ? 'You haven\'t received any reviews yet'
                : `No ${filter} reviews found`
              }
            </Text>
          </View>
        ) : (
          <>
            {reviews.map(renderReview)}
            <View className="py-6">
              <Text className="text-center text-gray-400 text-sm">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
