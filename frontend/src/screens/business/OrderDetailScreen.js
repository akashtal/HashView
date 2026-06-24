import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId, businessId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await ApiService.getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      console.log('Error fetching order detail:', error);
      Alert.alert('Error', 'Could not fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const response = await ApiService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    Alert.prompt('Cancel Order', 'Please enter a reason for cancellation:', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: async (reason) => {
          try {
            setUpdating(true);
            const response = await ApiService.cancelOrder(orderId, reason || 'Business Cancelled');
            if (response.success) setOrder(response.data);
          } catch (error) {
            Alert.alert('Error', error.message || 'Could not cancel order');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading || !order) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currencySymbol = '£';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">Order {order.orderNumber}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderInvoice', { orderId: order._id })}
          >
            <Icon name="document-text-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header Info */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Customer</Text>
            <Text className="font-bold text-gray-900">{order.customerName}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Table</Text>
            <Text className="font-bold text-gray-900">{order.tableNumber}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">People</Text>
            <Text className="font-bold text-gray-900">{order.numberOfPeople}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Time</Text>
            <Text className="font-bold text-gray-900">
              {new Date(order.placedAt).toLocaleTimeString()}
            </Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t border-gray-100">
            <Text className="text-gray-500">Status</Text>
            <Text className="font-bold uppercase text-[#6C47FF]">{order.status}</Text>
          </View>
        </View>

        {/* Special Instructions */}
        {order.orderNotes && (
          <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-100">
            <Text className="font-bold text-yellow-800 mb-1">Notes</Text>
            <Text className="text-yellow-900">{order.orderNotes}</Text>
          </View>
        )}

        {/* Items */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="font-bold text-lg mb-3">Items</Text>
          {order.items.map((item, index) => (
            <View
              key={index}
              className="flex-row justify-between mb-3 border-b border-gray-50 pb-2"
            >
              <View className="flex-1 pr-2">
                <Text className="font-semibold text-gray-900">
                  {item.quantity}x {item.name}
                </Text>
                {item.customizationSelections?.length > 0 && (
                  <Text className="text-xs text-gray-500 mt-1">
                    {item.customizationSelections.map((c) => c.optionName).join(', ')}
                  </Text>
                )}
              </View>
              <Text className="font-semibold text-gray-900">
                {currencySymbol}
                {item.itemTotal.toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="pt-2 border-t border-gray-100 mt-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-600">Subtotal</Text>
              <Text className="text-gray-900">
                {currencySymbol}
                {order.billing.subtotal.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-600">Taxes & Charges</Text>
              <Text className="text-gray-900">
                {currencySymbol}
                {(order.billing.totalTax + order.billing.totalCharges).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
              <Text className="font-bold text-lg text-gray-900">Total</Text>
              <Text className="font-bold text-lg text-[#6C47FF]">
                {currencySymbol}
                {order.billing.grandTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mb-8">
          <Text className="font-bold text-gray-600 mb-3 ml-1">Update Status</Text>

          {order.status === 'new' && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus('accepted')}
              disabled={updating}
              className="bg-purple-600 p-4 rounded-xl items-center mb-3"
            >
              <Text className="text-white font-bold text-lg">Accept Order</Text>
            </TouchableOpacity>
          )}

          {order.status === 'accepted' && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus('preparing')}
              disabled={updating}
              className="bg-yellow-500 p-4 rounded-xl items-center mb-3"
            >
              <Text className="text-white font-bold text-lg">Mark Preparing</Text>
            </TouchableOpacity>
          )}

          {order.status === 'preparing' && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus('ready')}
              disabled={updating}
              className="bg-green-500 p-4 rounded-xl items-center mb-3"
            >
              <Text className="text-white font-bold text-lg">Mark Ready</Text>
            </TouchableOpacity>
          )}

          {order.status === 'ready' && (
            <TouchableOpacity
              onPress={() => handleUpdateStatus('delivered')}
              disabled={updating}
              className="bg-gray-800 p-4 rounded-xl items-center mb-3"
            >
              <Text className="text-white font-bold text-lg">Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {/* Cancel button available unless delivered/cancelled */}
          {['new', 'accepted', 'preparing', 'ready'].includes(order.status) && (
            <TouchableOpacity
              onPress={handleCancelOrder}
              disabled={updating}
              className="bg-white border border-red-500 p-4 rounded-xl items-center"
            >
              <Text className="text-red-500 font-bold text-lg">Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
