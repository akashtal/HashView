import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, RefreshControl, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function BusinessManagementScreen({ navigation, route }) {
  const [businesses, setBusinesses] = useState([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(route?.params?.filter || 'all'); // all, pending, active, rejected
  const [tripadvisorModal, setTripadvisorModal] = useState(null);
  const [tripAdvisorForm, setTripAdvisorForm] = useState({ rating: '', reviewCount: '', profileUrl: '' });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    filterBusinessList();
  }, [businesses, searchQuery, filterStatus]);

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

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBusinesses(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinesses();
  };

  const handleApprove = async (businessId) => {
    try {
      await ApiService.adminUpdateBusinessKYC(businessId, {
        kycStatus: 'approved',
        status: 'active'
      });
      fetchBusinesses();
    } catch (error) {
      console.error('Error approving business:', error);
    }
  };

  const handleReject = async (businessId) => {
    try {
      await ApiService.adminUpdateBusinessKYC(businessId, {
        kycStatus: 'rejected',
        status: 'rejected'
      });
      fetchBusinesses();
    } catch (error) {
      console.error('Error rejecting business:', error);
    }
  };

  const handleOpenTripAdvisorModal = (business) => {
    setTripadvisorModal(business);
    setTripAdvisorForm({
      rating: business.externalProfiles?.tripAdvisor?.rating?.toString() || '',
      reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount?.toString() || '',
      profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
    });
  };

  const handleSaveTripAdvisor = async () => {
    try {
      await ApiService.updateTripAdvisorRating(
        tripadvisorModal._id,
        tripAdvisorForm.rating,
        tripAdvisorForm.reviewCount
      );
      
      // Also update profile URL if changed
      if (tripAdvisorForm.profileUrl !== tripadvisorModal.externalProfiles?.tripAdvisor?.profileUrl) {
        await ApiService.adminUpdateBusiness(tripadvisorModal._id, {
          'externalProfiles.tripAdvisor.profileUrl': tripAdvisorForm.profileUrl
        });
      }

      setTripadvisorModal(null);
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating TripAdvisor:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'active': return '#ECFDF5';
      case 'pending': return '#FFF7ED';
      case 'rejected': return '#FEF2F2';
      default: return '#F3F4F6';
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
        colors={['#F59E0B', '#F97316']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Businesses</Text>
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
          {['all', 'pending', 'active', 'rejected'].map((status) => (
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
                style={{ color: filterStatus === status ? '#F59E0B' : '#FFF' }}
              >
                {status}
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
              <Icon name="business-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? 'No businesses found' : 'No businesses yet'}
              </Text>
            </View>
          ) : (
            filteredBusinesses.map((business) => (
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
                    <Text className="text-xs text-gray-400">{business.email}</Text>
                    <View className="flex-row items-center mt-2">
                      <View
                        className="px-2 py-1 rounded-lg"
                        style={{ backgroundColor: getStatusBg(business.status) }}
                      >
                        <Text
                          className="text-xs font-semibold capitalize"
                          style={{ color: getStatusColor(business.status) }}
                        >
                          {business.status}
                        </Text>
                      </View>
                      {business.category && (
                        <View className="ml-2 px-2 py-1 rounded-lg bg-gray-100">
                          <Text className="text-xs text-gray-600 capitalize">{business.category}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Ratings */}
                <View className="flex-row items-center mb-3 pt-3 border-t border-gray-100">
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 mb-1">HashView</Text>
                    <View className="flex-row items-center">
                      <Icon name="star" size={14} color="#F59E0B" />
                      <Text className="text-sm font-bold ml-1">{business.rating?.average?.toFixed(1) || '0.0'}</Text>
                    </View>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 mb-1">Google</Text>
                    <View className="flex-row items-center">
                      <Icon name="logo-google" size={14} color="#4285F4" />
                      <Text className="text-sm font-bold ml-1">
                        {business.externalProfiles?.googleBusiness?.rating?.toFixed(1) || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 mb-1">TripAdvisor</Text>
                    <View className="flex-row items-center">
                      <Icon name="airplane" size={14} color="#00AA6C" />
                      <Text className="text-sm font-bold ml-1">
                        {business.externalProfiles?.tripAdvisor?.rating?.toFixed(1) || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center">
                  {business.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        onPress={() => handleApprove(business._id)}
                        className="flex-1 mr-2 py-2 rounded-xl items-center"
                        style={{ backgroundColor: '#10B98120' }}
                      >
                        <View className="flex-row items-center">
                          <Icon name="checkmark-circle" size={16} color="#10B981" />
                          <Text className="ml-1 font-semibold" style={{ color: '#10B981' }}>Approve</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReject(business._id)}
                        className="flex-1 mr-2 py-2 rounded-xl items-center"
                        style={{ backgroundColor: '#EF444420' }}
                      >
                        <View className="flex-row items-center">
                          <Icon name="close-circle" size={16} color="#EF4444" />
                          <Text className="ml-1 font-semibold" style={{ color: '#EF4444' }}>Reject</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={() => handleOpenTripAdvisorModal(business)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{ backgroundColor: '#00AA6C20' }}
                  >
                    <View className="flex-row items-center">
                      <Icon name="airplane" size={16} color="#00AA6C" />
                      <Text className="ml-1 font-semibold text-xs" style={{ color: '#00AA6C' }}>TripAdvisor</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* TripAdvisor Modal */}
      {tripadvisorModal && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setTripadvisorModal(null)}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900">TripAdvisor Rating</Text>
                <TouchableOpacity onPress={() => setTripadvisorModal(null)}>
                  <Icon name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text className="text-base font-semibold text-gray-900 mb-4">{tripadvisorModal.name}</Text>

              {/* Profile URL */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">TripAdvisor Profile URL</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="https://www.tripadvisor.com/..."
                  value={tripAdvisorForm.profileUrl}
                  onChangeText={(text) => setTripAdvisorForm({ ...tripAdvisorForm, profileUrl: text })}
                />
              </View>

              {/* Rating */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Rating (0-5)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="4.5"
                  keyboardType="decimal-pad"
                  value={tripAdvisorForm.rating}
                  onChangeText={(text) => setTripAdvisorForm({ ...tripAdvisorForm, rating: text })}
                />
              </View>

              {/* Review Count */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Total Reviews</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="123"
                  keyboardType="number-pad"
                  value={tripAdvisorForm.reviewCount}
                  onChangeText={(text) => setTripAdvisorForm({ ...tripAdvisorForm, reviewCount: text })}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveTripAdvisor}
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

