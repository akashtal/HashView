import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function OrderInvoiceScreen({ navigation, route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await ApiService.getOrderById(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      console.log('Error fetching order invoice:', error);
      Alert.alert('Error', 'Could not load order invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // In a real app, this would use expo-print to generate a PDF and print.
    // For now, we'll just show an alert.
    Alert.alert('Print Invoice', 'Printing feature would trigger here using expo-print.');
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-500">Order not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-1">
            <Icon name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Invoice</Text>
        </View>
        <TouchableOpacity
          onPress={handlePrint}
          className="bg-gray-100 px-3 py-1.5 rounded-lg flex-row items-center"
        >
          <Icon name="print-outline" size={18} color="#374151" />
          <Text className="text-gray-700 font-semibold text-xs ml-1">Print</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Receipt Card */}
        <View className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <View className="items-center mb-6 border-b border-gray-100 pb-6">
            <Text className="text-2xl font-black text-gray-900 tracking-wider">RECEIPT</Text>
            <Text className="text-gray-500 mt-1">Order #{order.orderNumber}</Text>
            <Text className="text-gray-400 text-xs mt-1">
              {new Date(order.createdAt).toLocaleString()}
            </Text>
          </View>

          <View className="flex-row justify-between mb-4">
            <View>
              <Text className="text-xs text-gray-400 uppercase font-bold">Table</Text>
              <Text className="text-lg font-bold text-gray-900">{order.tableNumber || 'N/A'}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-400 uppercase font-bold">Customer</Text>
              <Text className="text-lg font-bold text-gray-900">
                {order.customerName || 'Guest'}
              </Text>
            </View>
          </View>

          <View className="border-t border-dashed border-gray-300 py-4 mb-4">
            <Text className="text-sm font-bold text-gray-800 mb-3">ITEMS</Text>
            {order.items.map((item, index) => (
              <View key={index} className="flex-row justify-between mb-2">
                <View className="flex-1 pr-4">
                  <Text className="text-gray-800">
                    {item.quantity}x {item.name}
                  </Text>
                  {item.variants &&
                    item.variants.map((v, i) => (
                      <Text key={i} className="text-xs text-gray-500 ml-4">
                        + {v.name}
                      </Text>
                    ))}
                </View>
                <Text className="text-gray-800 font-medium">
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View className="border-t border-gray-100 pt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500">Subtotal</Text>
              <Text className="text-gray-800">
                ${order.billing?.subTotal?.toFixed(2) || '0.00'}
              </Text>
            </View>

            {order.billing?.taxes?.map((tax, index) => (
              <View key={index} className="flex-row justify-between mb-2">
                <Text className="text-gray-500">
                  {tax.name} ({tax.rate}%)
                </Text>
                <Text className="text-gray-800">${tax.amount?.toFixed(2) || '0.00'}</Text>
              </View>
            ))}

            {order.billing?.charges?.map((charge, index) => (
              <View key={index} className="flex-row justify-between mb-2">
                <Text className="text-gray-500">
                  {charge.name} {charge.type === 'percentage' ? `(${charge.value}%)` : ''}
                </Text>
                <Text className="text-gray-800">${charge.amount?.toFixed(2) || '0.00'}</Text>
              </View>
            ))}

            <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-200">
              <Text className="text-lg font-bold text-gray-900">Total</Text>
              <Text className="text-2xl font-black text-gray-900">
                ${order.billing?.grandTotal?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
