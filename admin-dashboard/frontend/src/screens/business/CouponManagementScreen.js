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
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function CouponManagementScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [activeTab, setActiveTab] = useState('template'); // 'template' or 'issued'
  const [template, setTemplate] = useState(null);
  const [issuedCoupons, setIssuedCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    discountType: 'percentage',
    discountValue: '',
    minCartValue: '',
    maxDiscount: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch template
      const templateResponse = await ApiService.getBusinessCouponTemplate(businessId);
      setTemplate(templateResponse.template || null);
      
      // Fetch issued coupons
      const couponsResponse = await ApiService.getBusinessCoupons(businessId);
      setIssuedCoupons(couponsResponse.coupons || []);
    } catch (error) {
      console.error('Failed to load coupon data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateTemplate = async () => {
    if (!formData.discountValue) {
      Alert.alert('Error', 'Please enter discount value');
      return;
    }

    try {
      await ApiService.createCouponTemplate({
        businessId,
        rewardType: formData.discountType,
        rewardValue: parseFloat(formData.discountValue),
        description: formData.description || `${formData.discountValue}${formData.discountType === 'percentage' ? '%' : '£'} off on your next visit`,
        minPurchaseAmount: parseFloat(formData.minCartValue) || 0,
        maxDiscountAmount: parseFloat(formData.maxDiscount) || null
      });

      Alert.alert(
        'Success',
        'Coupon template created! Customers will receive this coupon when they review your business.'
      );
      setModalVisible(false);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create coupon template');
    }
  };

  const resetForm = () => {
    setFormData({
      discountType: 'percentage',
      discountValue: '',
      minCartValue: '',
      maxDiscount: '',
      description: ''
    });
  };

  const getStats = () => {
    const total = issuedCoupons.length;
    const active = issuedCoupons.filter(c => {
      const now = new Date();
      return c.status !== 'redeemed' && new Date(c.validUntil) >= now;
    }).length;
    const redeemed = issuedCoupons.filter(c => c.status === 'redeemed').length;
    const expired = total - active - redeemed;
    const redemptionRate = total > 0 ? Math.round((redeemed / total) * 100) : 0;

    return { total, active, redeemed, expired, redemptionRate };
  };

  const renderTemplate = () => {
    if (!template) {
      return (
        <View className="bg-white rounded-2xl p-6 items-center">
          <Icon name="ticket-outline" size={64} color="#D1D5DB" />
          <Text className="text-gray-900 text-lg font-bold mt-4">No Coupon Template</Text>
          <Text className="text-gray-500 text-center mt-2 mb-6">
            Create a coupon template that customers will receive when they review your business
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="rounded-xl px-6 py-3"
            >
              <Text className="text-white font-bold">Create Template</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    const getTemplateDisplay = () => {
      switch (template.rewardType) {
        case 'percentage':
          return { value: `${template.rewardValue}%`, label: 'OFF' };
        case 'fixed':
          return { value: `£${template.rewardValue}`, label: 'OFF' };
        case 'buy1get1':
          return { value: 'B1G1', label: 'Offer' };
        case 'free_drink':
          return { value: 'FREE', label: 'Drink' };
        default:
          return { value: `${template.rewardValue}%`, label: 'OFF' };
      }
    };

    const display = getTemplateDisplay();

    return (
      <View className="bg-white rounded-2xl p-5 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-lg font-bold text-gray-900">Active Template</Text>
            <View className={`mt-2 px-3 py-1 rounded-full self-start ${
              template.isActive ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Text className={`text-xs font-semibold ${
                template.isActive ? 'text-green-700' : 'text-gray-700'
              }`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View className="w-24 h-24 rounded-2xl items-center justify-center" style={{ backgroundColor: '#FFF9F0' }}>
            <Text className="text-3xl font-bold" style={{ color: COLORS.secondary }}>
              {display.value}
            </Text>
            <Text className="text-xs font-semibold mt-1" style={{ color: COLORS.secondary }}>
              {display.label}
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-100 pt-4">
          <Text className="text-sm text-gray-700 mb-3">{template.description}</Text>
          
          {template.minPurchaseAmount > 0 && (
            <View className="flex-row items-center mb-2">
              <Icon name="cart-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">
                Min. cart: £{template.minPurchaseAmount}
              </Text>
            </View>
          )}
          
          {template.maxDiscountAmount && (
            <View className="flex-row items-center mb-2">
              <Icon name="trending-down-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">
                Max. discount: £{template.maxDiscountAmount}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Icon name="time-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-2">
              Valid for: 2 hours from issue
            </Text>
          </View>
        </View>

        <View className="flex-row mt-4 space-x-2">
          <TouchableOpacity
            onPress={() => {
              // Pre-fill form with template data
              setFormData({
                discountType: template.rewardType,
                discountValue: template.rewardValue.toString(),
                minCartValue: template.minPurchaseAmount?.toString() || '',
                maxDiscount: template.maxDiscountAmount?.toString() || '',
                description: template.description || ''
              });
              setModalVisible(true);
            }}
            className="flex-1 bg-orange-50 rounded-xl py-3 items-center mr-2"
          >
            <Text className="font-semibold" style={{ color: COLORS.secondary }}>
              Edit Template
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-1 rounded-xl py-3 items-center"
            style={{ backgroundColor: COLORS.secondary }}
          >
            <Text className="text-white font-semibold">New Template</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStats = () => {
    const stats = getStats();

    return (
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <Text className="text-lg font-bold text-gray-900 mb-4">Coupon Statistics</Text>
        
        <View className="flex-row flex-wrap">
          <View className="w-1/2 mb-4">
            <Text className="text-2xl font-bold text-gray-900">{stats.total}</Text>
            <Text className="text-xs text-gray-500">Total Issued</Text>
          </View>
          
          <View className="w-1/2 mb-4">
            <Text className="text-2xl font-bold text-blue-600">{stats.active}</Text>
            <Text className="text-xs text-gray-500">Active</Text>
          </View>
          
          <View className="w-1/2">
            <Text className="text-2xl font-bold text-green-600">{stats.redeemed}</Text>
            <Text className="text-xs text-gray-500">Redeemed</Text>
          </View>
          
          <View className="w-1/2">
            <Text className="text-2xl font-bold" style={{ color: COLORS.secondary }}>
              {stats.redemptionRate}%
            </Text>
            <Text className="text-xs text-gray-500">Redemption Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderIssuedCoupon = (coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    const hoursLeft = Math.max(0, Math.floor((validUntil - now) / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor(((validUntil - now) % (1000 * 60 * 60)) / (1000 * 60)));

    const getStatus = () => {
      if (coupon.status === 'redeemed') return { text: 'Redeemed', color: 'bg-green-100 text-green-700' };
      if (validUntil < now) return { text: 'Expired', color: 'bg-gray-100 text-gray-700' };
      return { text: 'Active', color: 'bg-blue-100 text-blue-700' };
    };

    const status = getStatus();

    return (
      <View key={coupon._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2 flex-wrap">
              <View className="rounded-full px-3 py-1 mr-2 mb-1" style={{ backgroundColor: '#FFF9F0' }}>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary }}>
                  {coupon.code}
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1 mb-1 ${status.color}`}>
                <Text className="text-xs font-semibold">{status.text}</Text>
              </View>
            </View>
            
            <View className="flex-row items-center mb-1">
              <Icon name="person-outline" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {coupon.user?.name || 'User'}
              </Text>
            </View>

            {coupon.redeemedAt && (
              <View className="flex-row items-center">
                <Icon name="checkmark-circle" size={14} color="#10B981" />
                <Text className="text-xs text-green-600 ml-1">
                  {new Date(coupon.redeemedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          <View className="items-end">
            <Text className="text-xs text-gray-500">
              {status.text === 'Active'
                ? `${hoursLeft}h ${minutesLeft}m left`
                : status.text === 'Expired'
                ? 'Expired'
                : 'Used'}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              {new Date(coupon.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Coupon Management</Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Icon name="add-circle" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white/20 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('template')}
            className={`flex-1 py-2 rounded-lg ${activeTab === 'template' ? 'bg-white' : ''}`}
          >
            <Text className={`text-center font-semibold ${
              activeTab === 'template' ? 'text-orange-500' : 'text-white'
            }`}>
              Template
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveTab('issued')}
            className={`flex-1 py-2 rounded-lg ${activeTab === 'issued' ? 'bg-white' : ''}`}
          >
            <Text className={`text-center font-semibold ${
              activeTab === 'issued' ? 'text-orange-500' : 'text-white'
            }`}>
              Issued ({issuedCoupons.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'template' ? (
          <>
            {renderTemplate()}
            <View className="mt-4">
              {renderStats()}
            </View>
          </>
        ) : (
          <>
            <Text className="text-sm text-gray-500 mb-4">
              {issuedCoupons.length} coupon{issuedCoupons.length !== 1 ? 's' : ''} issued
            </Text>
            {issuedCoupons.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center">
                <Icon name="ticket-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-500 mt-4 text-center">
                  No coupons issued yet.{'\n'}Customers will get coupons when they review.
                </Text>
              </View>
            ) : (
              issuedCoupons.map(renderIssuedCoupon)
            )}
          </>
        )}
        
        <View className="h-6" />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">
                {template ? 'Update Template' : 'Create Template'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Discount Type */}
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
                  Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(£)'}
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
                <Text className="text-gray-900 font-semibold mb-2">Min Cart Value (£)</Text>
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
                  <Text className="text-gray-900 font-semibold mb-2">Max Discount (£)</Text>
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
              <View className="mb-6">
                <Text className="text-gray-900 font-semibold mb-2">Description</Text>
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

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCreateTemplate}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  className="rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-bold text-lg">
                    {template ? 'Update Template' : 'Create Template'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
