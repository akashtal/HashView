import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Modal, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function TripAdvisorManagementScreen({ navigation }) {
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, with-rating, without-rating
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({ rating: '', reviewCount: '', profileUrl: '' });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinessList();
  }, [businesses, searchQuery, filterType]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await ApiService.adminGetAllBusinesses();
      setBusinesses(response.data || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterBusinessList = () => {
    let filtered = [...businesses];

    // Filter by rating status
    if (filterType === 'with-rating') {
      filtered = filtered.filter(b => b.externalProfiles?.tripAdvisor?.rating);
    } else if (filterType === 'without-rating') {
      filtered = filtered.filter(b => !b.externalProfiles?.tripAdvisor?.rating);
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBusinesses(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const handleOpenEditModal = (business) => {
    setEditModal(business);
    setFormData({
      rating: business.externalProfiles?.tripAdvisor?.rating?.toString() || '',
      reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount?.toString() || '',
      profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
    });
  };

  const handleSave = async () => {
    if (!formData.rating || !formData.reviewCount) {
      Alert.alert('Error', 'Please enter both rating and review count');
      return;
    }

    const rating = parseFloat(formData.rating);
    if (rating < 0 || rating > 5) {
      Alert.alert('Error', 'Rating must be between 0 and 5');
      return;
    }

    try {
      await ApiService.updateTripAdvisorRating(editModal._id, formData.rating, formData.reviewCount);
      
      // Update profile URL if provided
      if (formData.profileUrl && formData.profileUrl !== editModal.externalProfiles?.tripAdvisor?.profileUrl) {
        await ApiService.adminUpdateBusiness(editModal._id, {
          'externalProfiles.tripAdvisor.profileUrl': formData.profileUrl
        });
      }

      Alert.alert('Success', 'TripAdvisor rating updated successfully');
      setEditModal(null);
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating TripAdvisor:', error);
      Alert.alert('Error', error.message || 'Failed to update TripAdvisor rating');
    }
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
        colors={['#00AA6C', '#008F5A']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">TripAdvisor Ratings</Text>
            <Text className="text-white/80 text-sm">{filteredBusinesses.length} businesses</Text>
          </View>
        </View>

        {/* Search */}
        <View className="bg-white/20 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Icon name="search" size={20} color="#FFF" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search businesses..."
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
          {['all', 'with-rating', 'without-rating'].map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              className="mr-2 px-4 py-2 rounded-full"
              style={{
                backgroundColor: filterType === type ? '#FFF' : 'rgba(255,255,255,0.2)'
              }}
            >
              <Text
                className="font-semibold capitalize"
                style={{ color: filterType === type ? '#00AA6C' : '#FFF' }}
              >
                {type === 'with-rating' ? 'With Rating' : type === 'without-rating' ? 'No Rating' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Businesses List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-4">
          {filteredBusinesses.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Icon name="airplane-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? 'No businesses found' : 'No businesses yet'}
              </Text>
            </View>
          ) : (
            filteredBusinesses.map((business) => {
              const hasRating = business.externalProfiles?.tripAdvisor?.rating;
              const rating = business.externalProfiles?.tripAdvisor?.rating || 0;
              const reviewCount = business.externalProfiles?.tripAdvisor?.reviewCount || 0;
              const profileUrl = business.externalProfiles?.tripAdvisor?.profileUrl;

              return (
                <View key={business._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  <View className="flex-row items-start mb-3">
                    {business.logo?.url ? (
                      <Image
                        source={{ uri: business.logo.url }}
                        className="w-16 h-16 rounded-xl mr-3"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-xl mr-3 bg-gray-200 items-center justify-center">
                        <Icon name="business" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900 mb-1">{business.name}</Text>
                      <Text className="text-xs text-gray-500">{business.ownerName}</Text>
                      {profileUrl && (
                        <Text className="text-xs text-blue-500 mt-1" numberOfLines={1}>
                          {profileUrl}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Rating Display */}
                  <View className="bg-green-50 rounded-xl p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Icon name="airplane" size={24} color="#00AA6C" />
                        <Text className="text-sm font-semibold text-gray-700 ml-2">TripAdvisor Rating</Text>
                      </View>
                      {hasRating ? (
                        <View className="flex-row items-center">
                          <Icon name="star" size={16} color="#00AA6C" />
                          <Text className="text-xl font-bold ml-1" style={{ color: '#00AA6C' }}>
                            {rating.toFixed(1)}
                          </Text>
                          <Text className="text-sm text-gray-500 ml-2">
                            ({reviewCount} reviews)
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-sm text-gray-400">No rating yet</Text>
                      )}
                    </View>
                  </View>

                  {/* Actions */}
                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(business)}
                    className="py-3 rounded-xl items-center"
                    style={{ backgroundColor: '#00AA6C' }}
                  >
                    <View className="flex-row items-center">
                      <Icon name="create" size={18} color="#FFF" />
                      <Text className="ml-2 font-bold text-white">
                        {hasRating ? 'Edit Rating' : 'Add Rating'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {editModal && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModal(null)}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">TripAdvisor Rating</Text>
                <TouchableOpacity onPress={() => setEditModal(null)}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text className="text-base font-semibold text-gray-900 mb-4">{editModal.name}</Text>

              {/* Profile URL */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  TripAdvisor Profile URL (Optional)
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-sm"
                  placeholder="https://www.tripadvisor.com/..."
                  value={formData.profileUrl}
                  onChangeText={(text) => setFormData({ ...formData, profileUrl: text })}
                  autoCapitalize="none"
                />
              </View>

              {/* Rating */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Rating * (0.0 - 5.0)
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-lg font-bold"
                  placeholder="4.5"
                  keyboardType="decimal-pad"
                  value={formData.rating}
                  onChangeText={(text) => setFormData({ ...formData, rating: text })}
                />
              </View>

              {/* Review Count */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Total Reviews *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-lg font-bold"
                  placeholder="123"
                  keyboardType="number-pad"
                  value={formData.reviewCount}
                  onChangeText={(text) => setFormData({ ...formData, reviewCount: text })}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#00AA6C' }}
              >
                <Text className="text-white font-bold text-base">Save TripAdvisor Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

