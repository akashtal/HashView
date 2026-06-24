import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import ReviewCard from '../../../components/common/ReviewCard';
import COLORS from '../../../config/colors';
import { getBusinessReviews } from '../../../store/slices/reviewSlice';

const computeCategoryAverages = (reviewList) => {
  const CATEGORIES = [
    'staff',
    'facilities',
    'cleanliness',
    'comfort',
    'valueForMoney',
    'location',
  ];
  const sums = {};
  const counts = {};
  CATEGORIES.forEach((k) => {
    sums[k] = 0;
    counts[k] = 0;
  });

  (reviewList || []).forEach((r) => {
    if (r.categoryRatings) {
      CATEGORIES.forEach((k) => {
        if (r.categoryRatings[k]) {
          sums[k] += r.categoryRatings[k];
          counts[k] += 1;
        }
      });
    }
  });

  const averages = {};
  CATEGORIES.forEach((k) => {
    averages[k] = counts[k] > 0 ? sums[k] / counts[k] : null;
  });
  return averages;
};

const ReviewsTab = ({
  reviews,
  displayBusiness,
  oldReviewCount,
  showOldReviews,
  setShowOldReviews,
  oldReviewsLoading,
  oldReviews,
  oldReviewsHasMore,
  oldReviewsPage,
  handleVideoPress,
  dispatch,
  targetId,
}) => {
  return (
    <View>
      {reviews.length === 0 ? (
        <View className="items-center py-16">
          <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text className="text-gray-400 mt-4 text-base font-medium">No reviews yet</Text>
          <Text className="text-gray-300 text-sm mt-1">
            Be the first to share your experience!
          </Text>
        </View>
      ) : (
        <View>
          {/* ── Overall Score Row ── */}
          <View className="flex-row items-center mb-5">
            <View
              className="w-[52px] h-[52px] rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Text className="text-white text-xl font-black">
                {displayBusiness.rating?.average
                  ? (displayBusiness.rating.average * 2).toFixed(1)
                  : (
                      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) *
                      2
                    ).toFixed(1)}
              </Text>
            </View>
            <View>
              <Text className="text-base font-black text-gray-900">
                {(() => {
                  const avg =
                    displayBusiness.rating?.average ||
                    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                  if (avg >= 4.5) return 'Exceptional';
                  if (avg >= 4) return 'Very good';
                  if (avg >= 3.5) return 'Good';
                  return 'Reviews';
                })()}
              </Text>
              <Text className="text-sm text-gray-500">
                {displayBusiness.rating?.count || reviews.length} reviews
              </Text>
            </View>
          </View>

          {/* ── Categories: 1-column list (Booking.com mobile style) ── */}
          {(() => {
            const avgs = computeCategoryAverages(reviews);
            const CATS = [
              { key: 'location', label: 'Location' },
              { key: 'cleanliness', label: 'Cleanliness' },
              { key: 'valueForMoney', label: 'Value for money' },
              { key: 'facilities', label: 'Facilities' },
              { key: 'comfort', label: 'Comfort' },
              { key: 'staff', label: 'Staff' },
            ];
            const available = CATS.filter((c) => avgs[c.key] !== null);
            if (available.length === 0) return null;
            return (
              <View className="mb-6">
                {available.map(({ key, label }) => {
                  const val = avgs[key];
                  return (
                    <View key={key} className="mb-4">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-sm text-gray-800 font-semibold">{label}</Text>
                        <Text className="text-sm font-bold text-gray-900">
                          {val.toFixed(1)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: '#E0E0E0',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${(val / 10) * 100}%`,
                            height: '100%',
                            backgroundColor: '#003580',
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
                <View className="h-px bg-gray-200 mt-2 mb-2" />
              </View>
            );
          })()}

          {/* ── Reviews heading ── */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-base font-black text-gray-900">All Reviews</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Most recent first</Text>
            </View>
            <View className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1">
              <Text className="text-xs font-bold text-purple-700">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* ── Review Cards ── */}
          {reviews.length === 0 ? (
            <View className="items-center py-8 bg-gray-50 rounded-2xl mb-4">
              <Icon name="chatbubbles-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 font-medium">No reviews yet</Text>
              <Text className="text-gray-300 text-xs mt-1">
                Be the first to share your experience!
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                handleVideoPress={handleVideoPress}
                colors={COLORS}
              />
            ))
          )}

          {/* ── Show Older Reviews button ── */}
          {oldReviewCount > 0 && !showOldReviews && (
            <TouchableOpacity
              onPress={() => {
                setShowOldReviews(true);
                dispatch(
                  getBusinessReviews({
                    businessId: targetId,
                    params: { type: 'old', limit: 10, page: 1 },
                  })
                );
              }}
              activeOpacity={0.8}
              className="flex-row items-center justify-center py-3.5 px-5 rounded-2xl border border-gray-200 bg-gray-50 mb-4"
            >
              <Icon name="chevron-down-circle-outline" size={18} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-600 ml-2">
                Show {oldReviewCount} Older Review{oldReviewCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Older Reviews (lazy-loaded) ── */}
          {showOldReviews && (
            <View>
              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-px bg-gray-200" />
                <View className="mx-3 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                  <Text className="text-xs font-bold text-amber-700">Older Reviews</Text>
                </View>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {oldReviewsLoading && oldReviews.length === 0 ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text className="text-gray-400 text-xs mt-2">
                    Loading older reviews...
                  </Text>
                </View>
              ) : (
                oldReviews.map((review) => (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    handleVideoPress={handleVideoPress}
                    colors={COLORS}
                    isOld
                  />
                ))
              )}

              {oldReviewsHasMore && (
                <TouchableOpacity
                  onPress={() => {
                    dispatch(
                      getBusinessReviews({
                        businessId: targetId,
                        params: { type: 'old', limit: 10, page: oldReviewsPage + 1 },
                      })
                    );
                  }}
                  disabled={oldReviewsLoading}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center py-3 rounded-xl border border-gray-200 bg-white mb-4"
                >
                  {oldReviewsLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Icon name="add-circle-outline" size={16} color={COLORS.primary} />
                      <Text
                        className="text-sm font-semibold ml-2"
                        style={{ color: COLORS.primary }}
                      >
                        Load More
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ReviewsTab;
