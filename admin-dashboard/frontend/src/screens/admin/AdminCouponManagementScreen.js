import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function AdminCouponManagementScreen({ navigation }) {
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive, expired

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    filterCouponList();
  }, [coupons, searchQuery, filterStatus]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await ApiService.adminGetAllCoupons();
      setCoupons(response.data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCouponList = () => {
    let filtered = [...coupons];

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.isActive && (!c.validUntil || new Date(c.validUntil) > new Date()));
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(c => c.validUntil && new Date(c.validUntil) < new Date());
    }

    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.business?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCoupons(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      await ApiService.adminToggleCouponStatus(couponId, { isActive: !currentStatus });
      fetchCoupons();
      Alert.alert('Success', `Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling coupon:', error);
      Alert.alert('Error', 'Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = async (couponId, code) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete coupon "${code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.adminDeleteCoupon(couponId);
              fetchCoupons();
              Alert.alert('Success', 'Coupon deleted');
            } catch (error) {
              console.error('Error deleting coupon:', error);
              Alert.alert('Error', 'Failed to delete coupon');
            }
          }
        }
      ]
    );
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.rewardType === 'percentage') {
      return `${coupon.rewardValue}% OFF`;
    } else if (coupon.rewardType === 'fixed') {
      return `£${coupon.rewardValue} OFF`;
    } else if (coupon.rewardType === 'free_item' || coupon.rewardType === 'free_drink') {
      return coupon.itemName ? `FREE: ${coupon.itemName}` : 'FREE ITEM';
    } else if (coupon.rewardType === 'buy1get1') {
      return 'BUY 1 GET 1';
    }
    return 'DISCOUNT';
  };

  const isExpired = (validUntil) => {
    return validUntil && new Date(validUntil) < new Date();
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
        colors={['#EC4899', '#DB2777']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Coupons</Text>
            <Text className="text-white/80 text-sm">{filteredCoupons.length} coupons</Text>
          </View>
        </View>

        {/* Search */}
        <View className="bg-white/20 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Icon name="search" size={20} color="#FFF" />
          <TextInput
            className="flex-1 ml-2 text-white"
            placeholder="Search coupons..."
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
          {['all', 'active', 'inactive', 'expired'].map((status) => (
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
                style={{ color: filterStatus === status ? '#EC4899' : '#FFF' }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Coupons List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-4">
          {filteredCoupons.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Icon name="pricetag-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? 'No coupons found' : 'No coupons yet'}
              </Text>
            </View>
          ) : (
            filteredCoupons.map((coupon) => (
              <View key={coupon._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                {/* Coupon Header */}
                <View className="flex-row items-start mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-pink-50 px-3 py-1 rounded-lg mr-2">
                        <Text className="text-sm font-bold text-pink-600">{coupon.code}</Text>
                      </View>
                      {isExpired(coupon.validUntil) && (
                        <View className="bg-red-50 px-2 py-1 rounded-lg">
                          <Text className="text-xs font-semibold text-red-600">EXPIRED</Text>
                        </View>
                      )}
                      {!isExpired(coupon.validUntil) && (
                        <View
                          className="px-2 py-1 rounded-lg"
                          style={{
                            backgroundColor: coupon.isActive ? '#ECFDF5' : '#F3F4F6'
                          }}
                        >
                          <Text
                            className="text-xs font-semibold capitalize"
                            style={{
                              color: coupon.isActive ? '#10B981' : '#6B7280'
                            }}
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text className="text-base font-bold text-gray-900 mb-1">
                      {getDiscountDisplay(coupon)}
                    </Text>
                    
                    <Text className="text-sm text-gray-600 mb-2">{coupon.business?.name || 'Unknown Business'}</Text>
                    
                    {coupon.description && (
                      <Text className="text-xs text-gray-500">{coupon.description}</Text>
                    )}
                  </View>
                </View>

                {/* Coupon Details */}
                <View className="bg-gray-50 rounded-xl p-3 mb-3">
                  <View className="flex-row flex-wrap">
                    {coupon.minPurchaseAmount > 0 && (
                      <View className="flex-row items-center mr-4 mb-2">
                        <Icon name="cart-outline" size={14} color="#6B7280" />
                        <Text className="text-xs text-gray-600 ml-1">
                          Min. £{coupon.minPurchaseAmount}
                        </Text>
                      </View>
                    )}
                    {coupon.maxDiscountAmount > 0 && coupon.rewardType === 'percentage' && (
                      <View className="flex-row items-center mr-4 mb-2">
                        <Icon name="trending-down" size={14} color="#6B7280" />
                        <Text className="text-xs text-gray-600 ml-1">
                          Max. £{coupon.maxDiscountAmount}
                        </Text>
                      </View>
                    )}
                    {coupon.validUntil && (
                      <View className="flex-row items-center mr-4 mb-2">
                        <Icon name="calendar-outline" size={14} color="#6B7280" />
                        <Text className="text-xs text-gray-600 ml-1">
                          Until {new Date(coupon.validUntil).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center mb-2">
                      <Icon name="people-outline" size={14} color="#6B7280" />
                      <Text className="text-xs text-gray-600 ml-1">
                        {coupon.usedCount || 0} uses
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center">
                  {!isExpired(coupon.validUntil) && (
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(coupon._id, coupon.isActive)}
                      className="flex-1 mr-2 py-2 rounded-xl items-center"
                      style={{
                        backgroundColor: coupon.isActive ? '#FEF2F2' : '#ECFDF5'
                      }}
                    >
                      <View className="flex-row items-center">
                        <Icon
                          name={coupon.isActive ? 'pause-circle' : 'play-circle'}
                          size={16}
                          color={coupon.isActive ? '#EF4444' : '#10B981'}
                        />
                        <Text
                          className="ml-1 font-semibold text-xs"
                          style={{
                            color: coupon.isActive ? '#EF4444' : '#10B981'
                          }}
                        >
                          {coupon.isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteCoupon(coupon._id, coupon.code)}
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

                {/* Terms & Conditions */}
                {coupon.termsAndConditions && (
                  <View className="mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Terms & Conditions:</Text>
                    <Text className="text-xs text-gray-500">{coupon.termsAndConditions}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

