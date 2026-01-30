import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getUserReviews } from '../../store/slices/reviewSlice';
import { getRewardHistory } from '../../store/slices/couponSlice';
import COLORS from '../../config/colors';

export default function HistoryScreen() {
  const dispatch = useDispatch();
  const { userReviews, loading: reviewLoading } = useSelector((state) => state.review);
  const { rewards, loading: rewardLoading } = useSelector((state) => state.coupon);
  const [activeTab, setActiveTab] = React.useState('reviews'); // 'reviews' or 'rewards'

  useEffect(() => {
    if (activeTab === 'reviews') {
      dispatch(getUserReviews({ page: 1, limit: 20 }));
    } else {
      dispatch(getRewardHistory({ page: 1, limit: 20 }));
    }
  }, [activeTab]);

  const renderReview = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">
            {item.business?.name || 'Business'}
          </Text>
          <View className="flex-row items-center">
            {[...Array(5)].map((_, i) => (
              <Icon
                key={i}
                name="star"
                size={14}
                color={i < item.rating ? COLORS.secondary : '#E5E7EB'}
              />
            ))}
            <Text className="text-xs text-gray-500 ml-2">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.couponAwarded && (
          <View className="bg-green-100 rounded-full px-3 py-1">
            <Text className="text-xs text-green-700 font-semibold">Coupon Earned</Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-700">{item.comment}</Text>
    </View>
  );

  const renderReward = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">
            {item.business?.name || 'Business'}
          </Text>
          <View className="flex-row items-center mb-2">
            <Icon name="gift" size={16} color={COLORS.secondary} />
            <Text className="text-sm text-gray-700 ml-2 font-semibold">{item.code}</Text>
          </View>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${
            item.status === 'active' ? 'bg-green-100' :
            item.status === 'redeemed' ? 'bg-blue-100' :
            item.status === 'expired' ? 'bg-gray-100' :
            'bg-red-100'
          }`}
        >
          <Text
            className={`text-xs font-semibold capitalize ${
              item.status === 'active' ? 'text-green-700' :
              item.status === 'redeemed' ? 'text-blue-700' :
              item.status === 'expired' ? 'text-gray-700' :
              'text-red-700'
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>
      
      <Text className="text-sm text-gray-600 mb-1">{item.description}</Text>
      
      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          Valid until: {new Date(item.validUntil).toLocaleString()}
        </Text>
        {item.rewardType === 'discount_percentage' && (
          <Text className="text-sm font-bold" style={{ color: COLORS.secondary }}>{item.rewardValue}% OFF</Text>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6 rounded-b-3xl"
      >
        <Text className="text-white text-2xl font-bold mb-4">My History</Text>
        
        <View className="flex-row bg-white/20 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('reviews')}
            className="flex-1 py-3 rounded-lg"
            style={{ backgroundColor: activeTab === 'reviews' ? '#FFF' : 'transparent' }}
          >
            <Text
              className="text-center font-semibold"
              style={{ color: activeTab === 'reviews' ? COLORS.secondary : '#FFF' }}
            >
              Reviews
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('rewards')}
            className="flex-1 py-3 rounded-lg"
            style={{ backgroundColor: activeTab === 'rewards' ? '#FFF' : 'transparent' }}
          >
            <Text
              className="text-center font-semibold"
              style={{ color: activeTab === 'rewards' ? COLORS.secondary : '#FFF' }}
            >
              Rewards
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View className="flex-1 px-6 mt-4">
        {(reviewLoading || rewardLoading) ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        ) : activeTab === 'reviews' ? (
          userReviews.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4">No reviews yet</Text>
            </View>
          ) : (
            <FlatList
              data={userReviews}
              renderItem={renderReview}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          rewards.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Icon name="gift-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4">No rewards yet</Text>
            </View>
          ) : (
            <FlatList
              data={rewards}
              renderItem={renderReward}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>
    </View>
  );
}

