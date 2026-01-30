import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Modal, TextInput, Alert, Linking, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function BusinessDashboardScreen({ navigation }) {
  const [business, setBusiness] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [tripAdvisorModalVisible, setTripAdvisorModalVisible] = React.useState(false);
  const [tripAdvisorData, setTripAdvisorData] = React.useState({
    rating: '',
    reviewCount: ''
  });
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [redemptionStats, setRedemptionStats] = React.useState(null);
  const [loadingStats, setLoadingStats] = React.useState(false);

  // Refetch business data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBusinessData();
      fetchUnreadNotifications();
    }, [])
  );

  useEffect(() => {
    if (business?._id) {
      fetchRedemptionStats();
    }
  }, [business?._id]);

  const fetchUnreadNotifications = async () => {
    try {
      const response = await ApiService.getNotifications({ status: 'unread' });
      setUnreadNotifications(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRedemptionStats = async () => {
    if (!business?._id) return;
    try {
      setLoadingStats(true);
      const response = await ApiService.getRedemptionStats(business._id);
      if (response.success) {
        setRedemptionStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching redemption stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getMyBusinesses();
      if (response.businesses && response.businesses.length > 0) {
        setBusiness(response.businesses[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogleRatings = async () => {
    if (!business?._id || syncing) return;

    try {
      setSyncing(true);
      const response = await ApiService.syncGoogleReviews(business._id);

      if (response.success) {
        // Refresh business data to show updated ratings
        await fetchBusinessData();

        // Show success message
        alert(`✅ Google ratings synced successfully!\nRating: ${response.data?.rating || 'N/A'}\nReview Count: ${response.data?.reviewCount || 0}`);
      }
    } catch (error) {
      console.error('Google sync error:', error);
      alert(`Failed to sync Google ratings: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenTripAdvisorModal = () => {
    setTripAdvisorData({
      rating: business?.externalProfiles?.tripAdvisor?.rating?.toString() || '',
      reviewCount: business?.externalProfiles?.tripAdvisor?.reviewCount?.toString() || ''
    });
    setTripAdvisorModalVisible(true);
  };

  const handleUpdateTripAdvisorRating = async () => {
    if (!tripAdvisorData.rating || !tripAdvisorData.reviewCount) {
      Alert.alert('Error', 'Please enter both rating and review count');
      return;
    }

    const rating = parseFloat(tripAdvisorData.rating);
    const reviewCount = parseInt(tripAdvisorData.reviewCount);

    if (isNaN(rating) || rating < 0 || rating > 5) {
      Alert.alert('Error', 'Rating must be between 0 and 5');
      return;
    }

    if (isNaN(reviewCount) || reviewCount < 0) {
      Alert.alert('Error', 'Review count must be a positive number');
      return;
    }

    try {
      setSyncing(true);
      const response = await ApiService.updateTripAdvisorRating(business._id, rating, reviewCount);

      if (response.success) {
        await fetchBusinessData();
        setTripAdvisorModalVisible(false);
        Alert.alert('Success', 'TripAdvisor rating updated successfully!');
      }
    } catch (error) {
      console.error('TripAdvisor update error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update TripAdvisor rating');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenTripAdvisorProfile = () => {
    const url = business?.externalProfiles?.tripAdvisor?.profileUrl;
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open TripAdvisor profile');
      });
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="flex-1 justify-center items-center"
      >
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </LinearGradient>
    );
  }

  if (!business) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View className="flex-1 justify-center items-center px-6">
          <Icon name="business-outline" size={80} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-900 mt-6 mb-2">No Business Registered</Text>
          <Text className="text-gray-500 text-center mb-8">
            Register your business to start receiving reviews and managing your presence
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('BusinessRegistration')}
            className="rounded-xl px-8 py-4 shadow-lg"
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="rounded-xl px-8 py-4"
            >
              <Text className="text-white font-bold text-base">Register Business</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-15 px-6"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">My Business</Text>

          {/* Notifications Bell */}
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Notifications');
              setUnreadNotifications(0);
            }}
            activeOpacity={0.7}
            style={{ position: 'relative' }}
          >
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 50,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="notifications-outline" size={22} color="#FFF" />
              {unreadNotifications > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 5,
                  borderWidth: 2,
                  borderColor: COLORS.primary
                }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient >

      <ScrollView className="flex-1 bg-gray-50">

        <View className="px-4 -mt-0 mb-0">
          {/* Pending Admin Approval Banner */}
          {(business.status === 'pending' || (business.kycStatus !== 'verified' && business.kycStatus !== 'approved')) && (
            <View className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-4">
              <View className="flex-row items-start">
                <Icon name="time" size={22} color="#D97706" />
                <View className="ml-3 flex-1">
                  <Text className="text-yellow-900 font-semibold">Pending Admin Approval</Text>
                  <Text className="text-yellow-800 text-sm mt-1">
                    Your business is currently under review by the admin. You will be notified once it is approved.
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-4">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-2">{business.name}</Text>
                <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                  {business.address?.fullAddress || 'No address'}
                </Text>
              </View>
            </View>

            <View className={`rounded-full px-4 py-2 self-start mb-4 ${getStatusColor(business.status)}`}>
              <Text className="text-sm font-semibold capitalize">{business.status}</Text>
            </View>

            <View className="flex-row justify-between pt-4 border-t border-gray-100">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {business.rating?.average?.toFixed(1) || '0.0'}
                </Text>
                <Text className="text-xs text-gray-500">Rating</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {business.reviewCount || 0}
                </Text>
                <Text className="text-xs text-gray-500">Reviews</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {business.rating?.count || 0}
                </Text>
                <Text className="text-xs text-gray-500">Total</Text>
              </View>
            </View>

            {/* Google Rating Section */}
            {business.externalProfiles?.googleBusiness?.businessName && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Icon name="logo-google" size={20} color="#4285F4" />
                    <Text className="text-sm font-semibold text-gray-700 ml-2">Google Rating</Text>
                  </View>
                  {business.externalProfiles?.googleBusiness?.lastSynced && (
                    <Text className="text-xs text-gray-400">
                      Synced {new Date(business.externalProfiles.googleBusiness.lastSynced).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-gray-900 mr-2">
                      {business.externalProfiles?.googleBusiness?.rating?.toFixed(1) || 'N/A'}
                    </Text>
                    <Icon name="star" size={16} color="#FFC107" />
                    <Text className="text-sm text-gray-600 ml-2">
                      ({business.externalProfiles?.googleBusiness?.reviewCount || 0} reviews)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleSyncGoogleRatings}
                    disabled={syncing}
                    className="bg-blue-50 px-4 py-2 rounded-lg flex-row items-center"
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                      <>
                        <Icon name="refresh" size={16} color="#4285F4" />
                        <Text className="text-xs font-semibold text-blue-600 ml-1">Sync</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TripAdvisor Rating Section */}
            {business.externalProfiles?.tripAdvisor?.profileUrl && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Icon name="airplane" size={20} color="#00AA6C" />
                    <Text className="text-sm font-semibold text-gray-700 ml-2">TripAdvisor Rating</Text>
                  </View>
                  {business.externalProfiles?.tripAdvisor?.lastSynced && (
                    <Text className="text-xs text-gray-400">
                      Updated {new Date(business.externalProfiles.tripAdvisor.lastSynced).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-gray-900 mr-2">
                      {business.externalProfiles?.tripAdvisor?.rating?.toFixed(1) || 'N/A'}
                    </Text>
                    <Icon name="star" size={16} style={{ color: '#00AA6C' }} />
                    <Text className="text-sm text-gray-600 ml-2">
                      ({business.externalProfiles?.tripAdvisor?.reviewCount || 0} reviews)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleOpenTripAdvisorModal}
                    className="px-4 py-2 rounded-lg flex-row items-center"
                    style={{ backgroundColor: '#E8F5F1' }}
                  >
                    <Icon name="create-outline" size={16} color="#00AA6C" />
                    <Text className="text-xs font-semibold ml-1" style={{ color: '#00AA6C' }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleOpenTripAdvisorProfile}
                  className="flex-row items-center justify-center py-2 rounded-lg"
                  style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#00AA6C' }}
                >
                  <Icon name="open-outline" size={14} color="#00AA6C" />
                  <Text className="text-xs font-semibold ml-1" style={{ color: '#00AA6C' }}>
                    View on TripAdvisor
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="flex-row flex-wrap justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('ManageCouponsNew', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="ticket" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Coupons</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('CouponQRScanner', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#ECFDF5' }}>
                <Icon name="qr-code" size={24} color="#10B981" />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Scan QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ViewReviews', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="chatbubbles" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Reviews</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ManageUpdates', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#ECFDF5' }}>
                <Icon name="megaphone" size={24} color="#10B981" />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Updates & Offers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('AnalyticsDashboard', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="bar-chart" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('EditBusinessInfo', { businessId: business._id })}
              className="bg-white rounded-2xl p-4 shadow-sm items-center w-[48%] mb-3"
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: '#FFF9F0' }}>
                <Icon name="create" size={24} color={COLORS.secondary} />
              </View>
              <Text className="text-sm font-semibold text-gray-900">Edit Info</Text>
            </TouchableOpacity>
          </View>

          {/* Coupon Redemption Statistics */}
          {redemptionStats && (
            <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-900">Coupon Redemption Stats</Text>
                <TouchableOpacity onPress={fetchRedemptionStats} disabled={loadingStats}>
                  <Icon name="refresh" size={20} color={loadingStats ? '#9CA3AF' : COLORS.secondary} />
                </TouchableOpacity>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color={COLORS.secondary} />
              ) : (
                <>
                  {redemptionStats.template && (
                    <View className="mb-4 pb-4 border-b border-gray-100">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-600">Redemption Limit</Text>
                        <Text className="text-base font-semibold text-gray-900">
                          {redemptionStats.template.redemptionLimit || 'Unlimited'}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between mt-2">
                        <Text className="text-sm text-gray-600">Redeemed</Text>
                        <Text className="text-base font-semibold text-green-600">
                          {redemptionStats.template.redemptionCount || 0}
                        </Text>
                      </View>
                      {redemptionStats.template.redemptionLimit && (
                        <View className="mt-3">
                          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (redemptionStats.template.redemptionCount / redemptionStats.template.redemptionLimit) * 100)}%`
                              }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <View className="flex-row flex-wrap justify-between">
                    <View className="w-[48%] bg-green-50 rounded-xl p-3 mb-2">
                      <Text className="text-xs text-gray-600 mb-1">Redeemed</Text>
                      <Text className="text-2xl font-bold text-green-600">{redemptionStats.redeemed || 0}</Text>
                    </View>
                    <View className="w-[48%] bg-red-50 rounded-xl p-3 mb-2">
                      <Text className="text-xs text-gray-600 mb-1">Expired</Text>
                      <Text className="text-2xl font-bold text-red-600">{redemptionStats.expired || 0}</Text>
                    </View>
                    <View className="w-[48%] bg-blue-50 rounded-xl p-3">
                      <Text className="text-xs text-gray-600 mb-1">Active</Text>
                      <Text className="text-2xl font-bold text-blue-600">{redemptionStats.active || 0}</Text>
                    </View>
                    <View className="w-[48%] bg-gray-50 rounded-xl p-3">
                      <Text className="text-xs text-gray-600 mb-1">Total Issued</Text>
                      <Text className="text-2xl font-bold text-gray-700">{redemptionStats.totalIssued || 0}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Business Info */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <Text className="text-lg font-bold text-gray-900 mb-4">Business Information</Text>

            <View className="space-y-3">
              <View className="flex-row items-center py-2">
                <Icon name="mail" size={20} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-3">{business.email}</Text>
              </View>

              <View className="flex-row items-center py-2">
                <Icon name="call" size={20} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-3">{business.phone}</Text>
              </View>

              <View className="flex-row items-center py-2">
                <Icon name="pricetag" size={20} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-3 capitalize">{business.category}</Text>
              </View>

              <View className="flex-row items-center py-2">
                <Icon name="shield-checkmark" size={20} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-3 capitalize">
                  KYC: {business.kycStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* TripAdvisor Rating Edit Modal */}
      <Modal
        visible={tripAdvisorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTripAdvisorModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">Edit TripAdvisor Rating</Text>
                <TouchableOpacity onPress={() => setTripAdvisorModalVisible(false)}>
                  <Icon name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Rating */}
                <View className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Rating (0-5) *</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder="e.g., 4.5"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={tripAdvisorData.rating}
                    onChangeText={(value) => setTripAdvisorData({ ...tripAdvisorData, rating: value })}
                  />
                </View>

                {/* Review Count */}
                <View className="mb-6">
                  <Text className="text-gray-900 font-semibold mb-2">Review Count *</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder="e.g., 150"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={tripAdvisorData.reviewCount}
                    onChangeText={(value) => setTripAdvisorData({ ...tripAdvisorData, reviewCount: value })}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleUpdateTripAdvisorRating}
                  disabled={syncing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#00AA6C', '#008C57']}
                    className="rounded-xl py-4 items-center"
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Update Rating</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View >
  );
}

