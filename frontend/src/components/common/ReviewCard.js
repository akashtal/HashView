import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

// Lightweight relative-time formatter — no external dependency
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

const ReviewCard = ({ review, handleVideoPress, colors, isOld = false }) => {
  const CATEGORY_KEYS = [
    { key: 'staff', label: 'Staff' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'valueForMoney', label: 'Value' },
    { key: 'location', label: 'Location' },
  ];
  const initial = review.user?.name?.charAt(0)?.toUpperCase() || 'U';
  const avatarColors = ['#6C47FF', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];
  const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];
  const timeAgo = formatRelativeTime(review.updatedAt || review.createdAt);

  return (
    <View
      className="mb-5 pb-5"
      style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', opacity: isOld ? 0.88 : 1 }}
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
          <View className="flex-row items-center mt-0.5">
            <Text
              className="text-xs font-semibold"
              style={{ color: isOld ? '#9CA3AF' : '#7C3AED' }}
            >
              {timeAgo}
            </Text>
          </View>
        </View>
        <View
          className="w-10 h-10 rounded-lg items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white text-sm font-black">{(review.rating * 2).toFixed(0)}</Text>
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
        {review.emotion && <Text className="text-xs text-gray-400 ml-2">· {review.emotion}</Text>}
      </View>

      {/* Review text */}
      <Text className="text-sm text-gray-800 leading-5 mb-3">{review.comment}</Text>

      {/* Category rating pills */}
      {review.categoryRatings &&
        (() => {
          const rated = CATEGORY_KEYS.filter((c) => review.categoryRatings[c.key]);
          if (rated.length === 0) return null;
          return (
            <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
              {rated.map(({ key, label }) => {
                const val = review.categoryRatings[key];
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
            <TouchableOpacity key={idx} activeOpacity={0.85}>
              <Image
                source={{ uri: img.url }}
                style={{ width: 100, height: 100, borderRadius: 10 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Videos */}
      {review.videos && review.videos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {review.videos.map((video, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              style={{
                width: 100,
                height: 100,
                borderRadius: 10,
                backgroundColor: '#1a1a1a',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              onPress={() => handleVideoPress(video.url)}
            >
              {video.thumbnail && (
                <Image
                  source={{ uri: video.thumbnail }}
                  style={{ width: 100, height: 100, position: 'absolute' }}
                  resizeMode="cover"
                />
              )}
              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="play" size={20} color="#FFF" style={{ marginLeft: 3 }} />
              </View>
              {video.duration && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: 3,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '600' }}>
                    {Math.floor(video.duration / 60)}:
                    {(video.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default ReviewCard;
