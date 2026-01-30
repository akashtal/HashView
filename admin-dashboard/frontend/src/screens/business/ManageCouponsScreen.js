import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ManageCouponsScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    discountType: 'percentage',
    discountValue: '',
    minCartValue: '',
    maxDiscount: '',
    description: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBusinessCoupons(businessId);
      setCoupons(response.coupons || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!formData.discountValue) {
      Alert.alert('Error', 'Please enter discount value');
      return;
    }

    try {
      await ApiService.createCouponTemplate({
        businessId,
        rewardType: formData.discountType,
        rewardValue: parseFloat(formData.discountValue),
        description: formData.description || `${formData.discountValue}${formData.discountType === 'percentage' ? '%' : '₹'} off on your next visit`,
        minPurchaseAmount: parseFloat(formData.minCartValue) || 0,
        maxDiscountAmount: parseFloat(formData.maxDiscount) || null
      });

      Alert.alert(
        'Success', 
        'Coupon template created! Customers will receive this coupon when they review your business.',
        [{ text: 'OK' }]
      );
      setModalVisible(false);
      setFormData({
        discountType: 'percentage',
        discountValue: '',
        minCartValue: '',
        maxDiscount: '',
        description: ''
      });
      fetchCoupons();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create coupon template');
    }
  };

  const getCouponStatus = (coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    
    if (coupon.status === 'redeemed') return { text: 'Redeemed', color: 'bg-green-100 text-green-700' };
    if (validUntil < now) return { text: 'Expired', color: 'bg-gray-100 text-gray-700' };
    return { text: 'Active', color: 'bg-blue-100 text-blue-700' };
  };

  const getDiscountDisplay = (coupon) => {
    switch (coupon.rewardType) {
      case 'percentage':
        return `${coupon.rewardValue}%`;
      case 'fixed':
        return `₹${coupon.rewardValue}`;
      case 'buy1get1':
        return 'B1G1';
      case 'free_drink':
        return 'FREE';
      default:
        return `${coupon.rewardValue}%`;
    }
  };

  const getDiscountLabel = (coupon) => {
    switch (coupon.rewardType) {
      case 'percentage':
        return 'OFF';
      case 'fixed':
        return 'OFF';
      case 'buy1get1':
        return 'Buy 1 Get 1';
      case 'free_drink':
        return 'Drink';
      default:
        return 'OFF';
    }
  };

  const renderCoupon = (coupon) => {
    const status = getCouponStatus(coupon);
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    const hoursLeft = Math.max(0, Math.floor((validUntil - now) / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor(((validUntil - now) % (1000 * 60 * 60)) / (1000 * 60)));

    return (
      <View key={coupon._id} className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2 flex-wrap">
              <View className="rounded-full px-3 py-1 mr-2 mb-2" style={{ backgroundColor: '#FFF9F0' }}>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary }}>
                  {coupon.code}
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1 mb-2 ${status.color}`}>
                <Text className="text-xs font-semibold">{status.text}</Text>
              </View>
            </View>
            <Text className="text-sm text-gray-700 mb-2">{coupon.description}</Text>
            <View className="flex-row items-center mb-1">
              <Icon name="person-outline" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-1">
                {coupon.user?.name || 'User'}
              </Text>
            </View>
            {coupon.minPurchaseAmount > 0 && (
              <View className="flex-row items-center">
                <Icon name="cart-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">
                  Min. ₹{coupon.minPurchaseAmount}
                </Text>
              </View>
            )}
            {coupon.redeemedAt && (
              <View className="flex-row items-center mt-1">
                <Icon name="checkmark-circle" size={14} color="#10B981" />
                <Text className="text-xs text-green-600 ml-1">
                  Redeemed on {new Date(coupon.redeemedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
          <View className="w-20 h-20 rounded-2xl items-center justify-center" style={{ backgroundColor: '#FFF9F0' }}>
            <Text className="text-2xl font-bold" style={{ color: COLORS.secondary }}>
              {getDiscountDisplay(coupon)}
            </Text>
            <Text className="text-xs font-semibold mt-1" style={{ color: COLORS.secondary }}>
              {getDiscountLabel(coupon)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Icon name="time-outline" size={14} color={COLORS.secondary} />
            <Text className="text-xs text-gray-600 ml-1">
              {status.text === 'Active' 
                ? `${hoursLeft}h ${minutesLeft}m left` 
                : status.text === 'Expired' 
                ? 'Expired' 
                : 'Redeemed'}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            {new Date(coupon.createdAt).toLocaleTimeString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Manage Coupons</Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Icon name="add-circle" size={32} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView className="flex-1 px-6 py-6">
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        ) : coupons.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Icon name="ticket-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">
              No coupons yet.{'\n'}Create your first coupon!
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="mt-6"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                className="rounded-xl px-6 py-3"
              >
                <Text className="text-white font-bold">Create Coupon</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-sm text-gray-500 mb-4">
              {coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} issued
            </Text>
            {coupons.map(renderCoupon)}
          </>
        )}
      </ScrollView>

      {/* Create Coupon Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ minHeight: '50%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">Create Coupon</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Discount Type Dropdown */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Discount Type *</Text>
                <View className="flex-row flex-wrap">
                  {['percentage', 'fixed', 'buy1get1', 'free_drink'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFormData({ ...formData, discountType: type })}
                      className={`rounded-xl px-4 py-2 mr-2 mb-2 border-2 ${
                        formData.discountType === type ? 'border-orange-500' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: formData.discountType === type ? '#FFF9F0' : '#F9FAFB' }}
                    >
                      <Text className={`font-semibold ${
                        formData.discountType === type ? 'text-orange-600' : 'text-gray-700'
                      }`}>
                        {type === 'percentage' ? 'Percentage' :
                         type === 'fixed' ? 'Fixed' :
                         type === 'buy1get1' ? 'Buy 1 Get 1' : 'Free Drink'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Discount Value */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">
                  Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100'}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.discountValue}
                  onChangeText={(value) => setFormData({ ...formData, discountValue: value })}
                />
              </View>

              {/* Min Cart Value */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Min Cart Value (₹)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., 200"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.minCartValue}
                  onChangeText={(value) => setFormData({ ...formData, minCartValue: value })}
                />
              </View>

              {/* Max Discount */}
              {formData.discountType === 'percentage' && (
                <View className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Max Discount (₹)</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder="e.g., 500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formData.maxDiscount}
                    onChangeText={(value) => setFormData({ ...formData, maxDiscount: value })}
                  />
                </View>
              )}

              {/* Description */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Description (Optional)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., Thank you for your review!"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={(value) => setFormData({ ...formData, description: value })}
                />
              </View>

              {/* Info Box */}
              <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#FFF9F0' }}>
                <View className="flex-row items-center mb-2">
                  <Icon name="information-circle" size={20} color={COLORS.secondary} />
                  <Text className="text-sm font-bold ml-2" style={{ color: COLORS.secondary }}>
                    How Coupons Work
                  </Text>
                </View>
                <Text className="text-xs text-gray-600">
                  • Create coupon template here{'\n'}
                  • Customers get this coupon when they review your business{'\n'}
                  • Coupons are valid for 2 hours from time of issue{'\n'}
                  • Customers must be within your business radius to review (set by admin)
                </Text>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                onPress={handleCreateCoupon}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  className="rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-bold text-lg">Create Coupon</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

