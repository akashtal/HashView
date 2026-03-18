import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import ToastService from '../../utils/ToastService';

// Compute per-category averages across all reviews (1–10 scale)
const computeCategoryAverages = (reviews) => {
  const keys = ['location', 'cleanliness', 'valueForMoney', 'facilities', 'comfort', 'staff'];
  const result = {};
  keys.forEach(key => {
    const vals = reviews
      .map(r => r.categoryRatings?.[key])
      .filter(v => v != null && v > 0);
    result[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  return result;
};

const AVATAR_COLORS = ['#6C47FF', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];
const CATEGORY_KEYS = [
  { key: 'staff',         label: 'Staff' },
  { key: 'facilities',    label: 'Facilities' },
  { key: 'cleanliness',   label: 'Cleanliness' },
  { key: 'comfort',       label: 'Comfort' },
  { key: 'valueForMoney', label: 'Value' },
  { key: 'location',      label: 'Location' },
];

export default function ViewReviewsScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterRating, setFilterRating] = useState(null);
  const [stats, setStats] = useState({ average: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });

  useEffect(() => { fetchReviews(); }, [filterRating]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = filterRating ? { rating: filterRating } : {};
      const response = await ApiService.getBusinessReviews(businessId, params);
      const list = response.reviews || [];
      setReviews(list);
      if (list.length > 0) {
        const total = list.length;
        const sum   = list.reduce((acc, r) => acc + r.rating, 0);
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        list.forEach(r => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
        setStats({ average: sum / total, total, breakdown });
      } else {
        setStats({ average: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      }
    } catch (error) {
      console.error(error);
      ToastService.showError('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderRatingBar = (rating) => {
    const count = stats.breakdown[rating] || 0;
    const pct   = stats.total > 0 ? (count / stats.total) * 100 : 0;
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
            style={{ width: `${pct}%`, backgroundColor: filterRating === rating ? COLORS.primary : COLORS.secondary }}
          />
        </View>
        <Text className="text-sm text-gray-600 w-8 text-right">{count}</Text>
      </TouchableOpacity>
    );
  };

  const ratingLabel = (avg) => {
    if (avg >= 4.5) return 'Exceptional';
    if (avg >= 4)   return 'Very good';
    if (avg >= 3.5) return 'Good';
    return 'Reviews';
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="pt-12 pb-6 px-6">
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
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 py-5">

            {/* ── Stats Summary Card ── */}
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <View className="items-center mb-4">
                <Text className="text-5xl font-bold text-gray-900">{stats.average.toFixed(1)}</Text>
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

            {/* ── Filter indicator ── */}
            {filterRating && (
              <View className="flex-row items-center justify-between bg-white rounded-xl p-3 mb-4">
                <Text className="text-sm text-gray-700">Showing {filterRating}-star reviews</Text>
                <TouchableOpacity onPress={() => setFilterRating(null)}>
                  <Text className="text-sm font-semibold" style={{ color: COLORS.secondary }}>Clear Filter</Text>
                </TouchableOpacity>
              </View>
            )}

            {reviews.length === 0 ? (
              <View className="items-center py-20">
                <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-500 mt-4 text-center text-base font-medium">
                  {filterRating ? 'No reviews with this rating' : 'No reviews yet'}
                </Text>
              </View>
            ) : (
              <View>
                {/* ── Overall Score Row (Booking.com style) ── */}
                <View className="flex-row items-center mb-5">
                  <View
                    className="w-[52px] h-[52px] rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    <Text className="text-white text-xl font-black">
                      {(stats.average * 2).toFixed(1)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-base font-black text-gray-900">{ratingLabel(stats.average)}</Text>
                    <Text className="text-sm text-gray-500">{stats.total} reviews</Text>
                  </View>
                </View>

                {/* ── Category Breakdown Bars ── */}
                {(() => {
                  const avgs = computeCategoryAverages(reviews);
                  const CATS = [
                    { key: 'location',      label: 'Location' },
                    { key: 'cleanliness',   label: 'Cleanliness' },
                    { key: 'valueForMoney', label: 'Value for money' },
                    { key: 'facilities',    label: 'Facilities' },
                    { key: 'comfort',       label: 'Comfort' },
                    { key: 'staff',         label: 'Staff' },
                  ];
                  const available = CATS.filter(c => avgs[c.key] !== null);
                  if (available.length === 0) return null;
                  return (
                    <View className="mb-6">
                      {available.map(({ key, label }) => {
                        const val = avgs[key];
                        return (
                          <View key={key} className="mb-4">
                            <View className="flex-row justify-between items-center mb-1.5">
                              <Text className="text-sm text-gray-800 font-semibold">{label}</Text>
                              <Text className="text-sm font-bold text-gray-900">{val.toFixed(1)}</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
                              <View style={{ width: `${(val / 10) * 100}%`, height: '100%', backgroundColor: '#003580', borderRadius: 4 }} />
                            </View>
                          </View>
                        );
                      })}
                      <View className="h-px bg-gray-200 mt-2 mb-4" />
                    </View>
                  );
                })()}

                {/* ── "Customer reviews" heading ── */}
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="text-base font-black text-gray-900">Customer reviews</Text>
                  <Text className="text-xs text-gray-400">{reviews.length} total</Text>
                </View>

                {/* ── Detailed Review Cards ── */}
                {reviews.map((review) => {
                  const initial     = review.user?.name?.charAt(0)?.toUpperCase() || 'U';
                  const avatarColor = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
                  return (
                    <View
                      key={review._id}
                      className="mb-5 pb-5"
                      style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                    >
                      {/* Reviewer row */}
                      <View className="flex-row items-center mb-3">
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: avatarColor }}
                        >
                          <Text className="text-white text-lg font-bold">{initial}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-gray-900">
                            {review.user?.name || 'Anonymous'}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5">
                            Reviewed: {new Date(review.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View
                          className="w-10 h-10 rounded-lg items-center justify-center"
                          style={{ backgroundColor: COLORS.primary }}
                        >
                          <Text className="text-white text-sm font-black">
                            {(review.rating * 2).toFixed(0)}
                          </Text>
                        </View>
                      </View>

                      {/* Stars + Emotion */}
                      <View className="flex-row items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Icon
                            key={i}
                            name={i < review.rating ? 'star' : 'star-outline'}
                            size={14}
                            color={i < review.rating ? '#FFA500' : '#D5D5D5'}
                            style={{ marginRight: 1 }}
                          />
                        ))}
                        {review.emotion && (
                          <Text className="text-xs text-gray-400 ml-2">· {review.emotion}</Text>
                        )}
                      </View>

                      {/* Comment */}
                      <Text className="text-sm text-gray-800 leading-5 mb-3">{review.comment}</Text>

                      {/* Category rating pills */}
                      {review.categoryRatings && (() => {
                        const rated = CATEGORY_KEYS.filter(c => review.categoryRatings[c.key]);
                        if (rated.length === 0) return null;
                        return (
                          <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
                            {rated.map(({ key, label }) => {
                              const val   = review.categoryRatings[key];
                              const color = val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444';
                              return (
                                <View
                                  key={key}
                                  className="px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: color + '18' }}
                                >
                                  <Text className="text-[11px] font-semibold" style={{ color }}>
                                    {label} {val.toFixed(1)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })()}

                      {/* Photos */}
                      {review.images && review.images.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8 }}
                          className="mb-2"
                        >
                          {review.images.map((img, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: img.url }}
                              style={{ width: 100, height: 100, borderRadius: 10 }}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      )}

                      {/* Coupon awarded badge */}
                      {review.couponAwarded && (
                        <View className="flex-row items-center pt-2">
                          <Icon name="gift" size={14} color={COLORS.secondary} />
                          <Text className="text-xs ml-1.5 font-semibold" style={{ color: COLORS.secondary }}>
                            Coupon Awarded
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
