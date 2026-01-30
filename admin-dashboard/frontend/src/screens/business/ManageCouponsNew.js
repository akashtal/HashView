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

export default function ManageCouponsNew({ navigation, route }) {
  const { businessId } = route.params;
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    itemName: '', // For free_item/free_drink
    minPurchaseAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    redemptionLimit: '', // How many users can redeem coupons from this template
    terms: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBusinessCouponsList(businessId);
      setCoupons(response.coupons || []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      Alert.alert('Error', 'Failed to load coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      itemName: '',
      minPurchaseAmount: '',
      maxDiscountAmount: '',
      usageLimit: '',
      redemptionLimit: '',
      terms: ''
    });
    setEditingCoupon(null);
  };

  const handleOpenModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        title: coupon.title,
        description: coupon.description || '',
        discountType: coupon.rewardType,
        discountValue: coupon.rewardValue?.toString() || '',
        itemName: coupon.itemName || '',
        minPurchaseAmount: coupon.minPurchaseAmount?.toString() || '',
        maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
        usageLimit: coupon.usageLimit?.toString() || '',
        redemptionLimit: coupon.redemptionLimit?.toString() || '',
        terms: coupon.terms || ''
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    // Validation for free items
    const isFreeItem = formData.discountType === 'free_item' || formData.discountType === 'free_drink';
    
    if (!formData.code || !formData.title) {
      Alert.alert('Error', 'Please fill in Code and Title');
      return;
    }

    if (isFreeItem && !formData.itemName) {
      Alert.alert('Error', 'Please enter the item name for free item coupon');
      return;
    }

    if (!isFreeItem && !formData.discountValue) {
      Alert.alert('Error', 'Please enter discount value');
      return;
    }

    try {
      const payload = {
        businessId,
        code: formData.code.toUpperCase(),
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: isFreeItem ? 0 : parseFloat(formData.discountValue),
        itemName: isFreeItem ? formData.itemName : null,
        minPurchaseAmount: parseFloat(formData.minPurchaseAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        redemptionLimit: formData.redemptionLimit ? parseInt(formData.redemptionLimit) : null,
        terms: formData.terms
      };

      if (editingCoupon) {
        // Update existing coupon
        await ApiService.updateBusinessCoupon(editingCoupon._id, payload);
        Alert.alert('Success', 'Coupon updated successfully!');
      } else {
        // Create new coupon
        await ApiService.createBusinessCoupon(payload);
        Alert.alert('Success', 'Coupon created successfully!');
      }

      setModalVisible(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save coupon'
      );
    }
  };

  const handleDelete = (coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete "${coupon.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteBusinessCoupon(coupon._id);
              Alert.alert('Success', 'Coupon deleted successfully');
              fetchCoupons();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete coupon');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (coupon) => {
    try {
      await ApiService.toggleCouponStatus(coupon._id);
      Alert.alert('Success', `Coupon ${coupon.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchCoupons();
    } catch (error) {
      Alert.alert('Error', 'Failed to update coupon status');
    }
  };

  const getDiscountDisplay = (coupon) => {
    switch (coupon.rewardType) {
      case 'percentage':
        return `${coupon.rewardValue}% OFF`;
      case 'fixed':
        return `£${coupon.rewardValue} OFF`;
      case 'buy1get1':
        return 'BUY 1 GET 1';
      case 'free_item':
      case 'free_drink':
        return coupon.itemName ? `FREE: ${coupon.itemName}` : 'FREE ITEM';
      default:
        return `${coupon.rewardValue}% OFF`;
    }
  };

  const renderCoupon = (coupon) => {
    return (
      <View key={coupon._id} className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2 flex-wrap">
              <View className="rounded-full px-3 py-1 mr-2 mb-1" style={{ backgroundColor: '#FFF9F0' }}>
                <Text className="text-xs font-bold" style={{ color: COLORS.secondary }}>
                  {coupon.code}
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1 mb-1 ${
                coupon.isActive ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Text className={`text-xs font-semibold ${
                  coupon.isActive ? 'text-green-700' : 'text-gray-700'
                }`}>
                  {coupon.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            
            <Text className="text-base font-bold text-gray-900 mb-1">{coupon.title}</Text>
            <Text className="text-sm text-gray-600 mb-2">{coupon.description}</Text>
            
            <View className="flex-row items-center mb-1">
              <Icon name="pricetag-outline" size={14} color="#6B7280" />
              <Text className="text-xs text-gray-600 ml-1">
                {getDiscountDisplay(coupon)}
              </Text>
            </View>

            {coupon.minPurchaseAmount > 0 && (
              <View className="flex-row items-center mb-1">
                <Icon name="cart-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  Min. £{coupon.minPurchaseAmount}
                </Text>
              </View>
            )}

            {coupon.usageLimit && (
              <View className="flex-row items-center mb-1">
                <Icon name="people-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  Used {coupon.usageCount}/{coupon.usageLimit} times
                </Text>
              </View>
            )}
            {coupon.redemptionLimit && (
              <View className="flex-row items-center">
                <Icon name="gift-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-600 ml-1">
                  {coupon.redemptionCount || 0}/{coupon.redemptionLimit} redeemed
                </Text>
              </View>
            )}
          </View>

          <View className="w-16 h-16 rounded-xl items-center justify-center" style={{ backgroundColor: '#FFF9F0' }}>
            <Icon name="ticket" size={32} color={COLORS.secondary} />
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mt-3 pt-3 border-t border-gray-100">
          <TouchableOpacity
            onPress={() => handleToggleStatus(coupon)}
            className="flex-1 flex-row items-center justify-center py-2 mr-2 rounded-lg bg-gray-50"
          >
            <Icon 
              name={coupon.isActive ? 'pause-circle-outline' : 'play-circle-outline'} 
              size={18} 
              color="#6B7280" 
            />
            <Text className="text-gray-700 ml-1 font-semibold text-xs">
              {coupon.isActive ? 'Pause' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenModal(coupon)}
            className="flex-1 flex-row items-center justify-center py-2 mx-1 rounded-lg"
            style={{ backgroundColor: '#FFF9F0' }}
          >
            <Icon name="create-outline" size={18} color={COLORS.secondary} />
            <Text className="ml-1 font-semibold text-xs" style={{ color: COLORS.secondary }}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDelete(coupon)}
            className="flex-1 flex-row items-center justify-center py-2 ml-2 rounded-lg bg-red-50"
          >
            <Icon name="trash-outline" size={18} color="#EF4444" />
            <Text className="text-red-600 ml-1 font-semibold text-xs">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-gray-600">Loading coupons...</Text>
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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">Manage Coupons</Text>
          </View>
          <TouchableOpacity onPress={() => handleOpenModal()}>
            <Icon name="add-circle" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {coupons.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Icon name="ticket-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-900 text-lg font-bold mt-4">No Coupons Yet</Text>
            <Text className="text-gray-500 text-center mt-2 mb-6">
              Create your first coupon and start attracting more customers!
            </Text>
            <TouchableOpacity
              onPress={() => handleOpenModal()}
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
              {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} created
            </Text>
            {coupons.map(renderCoupon)}
          </>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">
                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
              </Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Icon name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Coupon Code */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Coupon Code *</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., SAVE20"
                  placeholderTextColor="#9CA3AF"
                  value={formData.code}
                  onChangeText={(value) => setFormData({ ...formData, code: value.toUpperCase() })}
                  maxLength={20}
                  autoCapitalize="characters"
                />
              </View>

              {/* Title */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Title *</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., Weekend Special"
                  placeholderTextColor="#9CA3AF"
                  value={formData.title}
                  onChangeText={(value) => setFormData({ ...formData, title: value })}
                  maxLength={100}
                />
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Description</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., Get 20% off on all items this weekend"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={(value) => setFormData({ ...formData, description: value })}
                  maxLength={500}
                />
              </View>

              {/* Discount Type */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Discount Type *</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { value: 'percentage', label: 'Percentage' },
                    { value: 'fixed', label: 'Fixed Amount' },
                    { value: 'buy1get1', label: 'Buy 1 Get 1' },
                    { value: 'free_item', label: 'Free Item' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => setFormData({ ...formData, discountType: type.value })}
                      className={`rounded-xl px-4 py-2 mr-2 mb-2 border-2 ${
                        formData.discountType === type.value ? 'border-orange-500' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: formData.discountType === type.value ? '#FFF9F0' : '#F9FAFB' }}
                    >
                      <Text className={`font-semibold text-sm ${
                        formData.discountType === type.value ? 'text-orange-600' : 'text-gray-700'
                      }`}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Discount Value OR Item Name */}
              {formData.discountType === 'free_item' || formData.discountType === 'free_drink' ? (
                <View className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Item Name *</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder="e.g., Coffee, Dessert, Side Dish"
                    placeholderTextColor="#9CA3AF"
                    value={formData.itemName}
                    onChangeText={(value) => setFormData({ ...formData, itemName: value })}
                    maxLength={100}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Specify which item will be given for free
                  </Text>
                </View>
              ) : (
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
              )}

              {/* Min Purchase Amount */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Min. Purchase Amount (£)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., 200"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.minPurchaseAmount}
                  onChangeText={(value) => setFormData({ ...formData, minPurchaseAmount: value })}
                />
              </View>

              {/* Max Discount (for percentage only) */}
              {formData.discountType === 'percentage' && (
                <View className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Max. Discount Amount (£)</Text>
                  <TextInput
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder="e.g., 500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formData.maxDiscountAmount}
                    onChangeText={(value) => setFormData({ ...formData, maxDiscountAmount: value })}
                  />
                </View>
              )}

              {/* Usage Limit */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Usage Limit (Optional)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., 100 (leave empty for unlimited)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.usageLimit}
                  onChangeText={(value) => setFormData({ ...formData, usageLimit: value })}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  How many times this coupon code can be used
                </Text>
              </View>

              {/* Redemption Limit */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Redemption Limit (Optional)</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., 10 (leave empty for unlimited)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.redemptionLimit}
                  onChangeText={(value) => setFormData({ ...formData, redemptionLimit: value })}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  How many users can redeem coupons from this template (e.g., 10 users can redeem review reward coupons)
                </Text>
              </View>

              {/* Terms */}
              <View className="mb-6">
                <Text className="text-gray-900 font-semibold mb-2">Terms & Conditions</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                  placeholder="e.g., Valid only on dine-in"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.terms}
                  onChangeText={(value) => setFormData({ ...formData, terms: value })}
                  maxLength={1000}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  className="rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-bold text-lg">
                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
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
