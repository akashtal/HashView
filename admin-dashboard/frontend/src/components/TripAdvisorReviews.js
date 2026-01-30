import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import COLORS from '../config/colors';

/**
 * TripAdvisor Reviews Component
 * Displays reviews fetched from Common Ninja API
 * 
 * Props:
 * - reviews: Array of TripAdvisor review objects
 * - rating: Average rating
 * - reviewCount: Total review count
 * - widgetUrl: Common Ninja widget URL (for WebView option)
 * - displayMode: 'summary' | 'list' | 'widget' | 'hybrid'
 * - tripAdvisorUrl: Link to TripAdvisor page
 */
export default function TripAdvisorReviews({ 
  reviews = [], 
  rating = 0, 
  reviewCount = 0,
  widgetUrl = null,
  tripAdvisorUrl = null,
  displayMode = 'summary',
  maxReviews = 10
}) {
  const renderStars = (ratingValue) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= ratingValue ? 'star' : 'star-outline'}
            size={16}
            color={star <= ratingValue ? '#00AA6C' : '#D1D5DB'} // TripAdvisor green
          />
        ))}
      </View>
    );
  };

  const handleReviewPress = (url) => {
    const finalUrl = url || tripAdvisorUrl;
    if (finalUrl) {
      Linking.openURL(finalUrl);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Summary Display Mode (Only Rating & Count) ⭐
  if (displayMode === 'summary') {
    return (
      <TouchableOpacity
        onPress={() => handleReviewPress(tripAdvisorUrl)}
        activeOpacity={0.7}
        className="bg-white rounded-2xl p-4 shadow-sm"
      >
        <View className="flex-row items-center justify-between">
          {/* TripAdvisor Logo & Name */}
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#E8F5F1' }}>
              <Icon name="airplane" size={20} color="#00AA6C" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">TripAdvisor</Text>
              {reviewCount > 0 && (
                <Text className="text-xs text-gray-500 mt-0.5">
                  {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </Text>
              )}
            </View>
          </View>

          {/* Rating Display */}
          {rating > 0 ? (
            <View className="flex-row items-center">
              {renderStars(Math.round(rating))}
              <Text className="ml-2 text-xl font-bold text-gray-900">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-gray-400">No rating yet</Text>
          )}
        </View>

        {/* View on TripAdvisor link */}
        {tripAdvisorUrl && (
          <View className="flex-row items-center justify-end mt-3 pt-3 border-t border-gray-100">
            <Text className="text-xs font-semibold mr-1" style={{ color: '#00AA6C' }}>
              View on TripAdvisor
            </Text>
            <Icon name="open-outline" size={14} color="#00AA6C" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Widget Display Mode (Full Common Ninja Widget in WebView)
  if (displayMode === 'widget' && widgetUrl) {
    return (
      <View className="flex-1">
        <WebView
          source={{ uri: widgetUrl }}
          style={{ flex: 1, minHeight: 400 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  // List Display Mode (Custom UI with review data)
  if (displayMode === 'list' || displayMode === 'hybrid') {
    const displayReviews = reviews.slice(0, maxReviews);

    return (
      <View>
        {/* TripAdvisor Header */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Image
                source={{ uri: 'https://static.tacdn.com/img2/brand_refresh/Tripadvisor_lockup_horizontal_secondary_registered.svg' }}
                style={{ width: 120, height: 30 }}
                resizeMode="contain"
              />
            </View>
            {rating > 0 && (
              <View className="flex-row items-center">
                {renderStars(Math.round(rating))}
                <Text className="ml-2 text-base font-bold text-gray-900">
                  {rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          
          {reviewCount > 0 && (
            <Text className="text-sm text-gray-600">
              {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </Text>
          )}
        </View>

        {/* Reviews List */}
        {displayReviews.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Icon name="chatbubbles-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 text-center mt-4">
              No TripAdvisor reviews yet
            </Text>
          </View>
        ) : (
          displayReviews.map((review, index) => (
            <TouchableOpacity
              key={review.reviewId || index}
              onPress={() => handleReviewPress(review.url)}
              activeOpacity={0.7}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
            >
              {/* Reviewer Info */}
              <View className="flex-row items-center mb-3">
                {review.authorPhoto ? (
                  <Image
                    source={{ uri: review.authorPhoto }}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full items-center justify-center bg-green-100">
                    <Text className="text-lg font-bold text-green-700">
                      {review.author?.charAt(0) || 'A'}
                    </Text>
                  </View>
                )}
                
                <View className="flex-1 ml-3">
                  <Text className="text-base font-bold text-gray-900">
                    {review.author || 'Anonymous'}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {formatDate(review.date)}
                  </Text>
                </View>

                {/* TripAdvisor Logo Badge */}
                <View className="bg-green-50 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold" style={{ color: '#00AA6C' }}>
                    TripAdvisor
                  </Text>
                </View>
              </View>

              {/* Rating */}
              <View className="flex-row items-center mb-2">
                {renderStars(review.rating)}
                {review.title && (
                  <Text className="ml-2 text-sm font-semibold text-gray-900">
                    {review.title}
                  </Text>
                )}
              </View>

              {/* Review Text */}
              {review.text && (
                <Text className="text-sm text-gray-700 leading-5 mb-3">
                  {review.text}
                </Text>
              )}

              {/* Helpful Count */}
              {review.helpful > 0 && (
                <View className="flex-row items-center">
                  <Icon name="thumbs-up-outline" size={14} color="#6B7280" />
                  <Text className="text-xs text-gray-500 ml-1">
                    {review.helpful} found this helpful
                  </Text>
                </View>
              )}

              {/* Link to full review */}
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                <Text className="text-xs text-gray-500 flex-1">
                  View on TripAdvisor
                </Text>
                <Icon name="open-outline" size={14} color="#00AA6C" />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Show More Link */}
        {reviews.length > maxReviews && (
          <TouchableOpacity
            onPress={() => handleReviewPress(reviews[0]?.url)}
            className="bg-white rounded-2xl p-4 items-center shadow-sm"
          >
            <Text className="text-sm font-semibold" style={{ color: '#00AA6C' }}>
              View all {reviews.length} reviews on TripAdvisor
            </Text>
          </TouchableOpacity>
        )}

        {/* Hybrid Mode: Show widget below reviews */}
        {displayMode === 'hybrid' && widgetUrl && (
          <View className="mt-4 bg-white rounded-2xl overflow-hidden shadow-sm" style={{ height: 400 }}>
            <WebView
              source={{ uri: widgetUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>
        )}
      </View>
    );
  }

  return null;
}

