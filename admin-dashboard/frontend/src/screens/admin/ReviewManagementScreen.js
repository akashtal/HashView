import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ReviewManagementScreen({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, flagged, deleted

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviewList();
  }, [reviews, searchQuery, filterStatus]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await ApiService.adminGetAllReviews();
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterReviewList = () => {
    let filtered = [...reviews];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(r =>
        r.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.business?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.review?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReviews(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleUpdateStatus = async (reviewId, newStatus) => {
    try {
      await ApiService.adminUpdateReviewStatus(reviewId, { status: newStatus });
      fetchReviews();
      Alert.alert('Success', `Review ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating review status:', error);
      Alert.alert('Error', 'Failed to update review status');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleUpdateStatus(reviewId, 'deleted')
        }
      ]
    );
  };

  const renderStars = (rating) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color="#F59E0B"
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Reviews</Text>
            <Text className="text-white/80 text-sm">{filteredReviews.length} reviews</Text>
          </View>
        </View>

        {/* Search */}
        <View className="bg-white/20 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Icon name="search" size={20} color="#FFF" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search reviews..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'active', 'flagged', 'deleted'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              className="mr-2 px-4 py-2 rounded-full"
              style={{
                backgroundColor: filterStatus === status ? '#FFF' : 'rgba(255,255,255,0.2)'
              }}
            >
              <Text
                className="font-semibold capitalize"
                style={{ color: filterStatus === status ? '#EF4444' : '#FFF' }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Reviews List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-4">
          {filteredReviews.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Icon name="star-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? 'No reviews found' : 'No reviews yet'}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => (
              <View key={review._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                {/* Review Header */}
                <View className="flex-row items-start mb-3">
                  <View className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-orange-500 items-center justify-center mr-3">
                    <Text className="text-white font-bold text-lg">
                      {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">{review.user?.name || 'Unknown User'}</Text>
                    <Text className="text-xs text-gray-500 mb-1">
                      {review.business?.name || 'Unknown Business'}
                    </Text>
                    <View className="flex-row items-center">
                      {renderStars(review.rating)}
                      <Text className="text-xs text-gray-400 ml-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: 
                        review.status === 'active' ? '#ECFDF5' :
                        review.status === 'flagged' ? '#FFF7ED' :
                        '#FEF2F2'
                    }}
                  >
                    <Text
                      className="text-xs font-semibold capitalize"
                      style={{
                        color:
                          review.status === 'active' ? '#10B981' :
                          review.status === 'flagged' ? '#F59E0B' :
                          '#EF4444'
                      }}
                    >
                      {review.status || 'active'}
                    </Text>
                  </View>
                </View>

                {/* Review Content */}
                {review.review && (
                  <View className="bg-gray-50 rounded-xl p-3 mb-3">
                    <Text className="text-sm text-gray-700">{review.review}</Text>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row items-center">
                  {review.status === 'active' && (
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(review._id, 'flagged')}
                      className="flex-1 mr-2 py-2 rounded-xl items-center"
                      style={{ backgroundColor: '#FFF7ED' }}
                    >
                      <View className="flex-row items-center">
                        <Icon name="flag" size={16} color="#F59E0B" />
                        <Text className="ml-1 font-semibold text-xs" style={{ color: '#F59E0B' }}>
                          Flag
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {review.status === 'flagged' && (
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(review._id, 'active')}
                      className="flex-1 mr-2 py-2 rounded-xl items-center"
                      style={{ backgroundColor: '#ECFDF5' }}
                    >
                      <View className="flex-row items-center">
                        <Icon name="checkmark-circle" size={16} color="#10B981" />
                        <Text className="ml-1 font-semibold text-xs" style={{ color: '#10B981' }}>
                          Approve
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteReview(review._id)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{ backgroundColor: '#EF444420' }}
                  >
                    <View className="flex-row items-center">
                      <Icon name="trash" size={16} color="#EF4444" />
                      <Text className="ml-1 font-semibold text-xs" style={{ color: '#EF4444' }}>
                        Delete
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

