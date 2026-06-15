import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import useOrderSocket from '../../hooks/useOrderSocket';

export default function KitchenViewScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await ApiService.getBusinessOrders(businessId, { status: 'active' });
      if (response.success) {
        const kitchenOrders = response.data.filter((o) =>
          ['new', 'accepted', 'preparing'].includes(o.status)
        );
        kitchenOrders.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
        setOrders(kitchenOrders);
      }
    } catch (error) {
      console.log('Error fetching kitchen orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useOrderSocket({
    businessId,
    onNewOrder: (order) => {
      // Add new order if it's relevant to kitchen (should be 'new' by default)
      if (['new', 'accepted', 'preparing'].includes(order.status)) {
        Vibration.vibrate([0, 500, 200, 500]);
        setOrders((prev) => {
          const updated = [...prev, order];
          updated.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
          return updated;
        });
      }
    },
    onOrderStatusUpdated: (updatedOrder) => {
      setOrders((prev) => {
        // If it's ready/delivered/cancelled, remove it from kitchen view
        if (!['new', 'accepted', 'preparing'].includes(updatedOrder.status)) {
          return prev.filter((o) => o._id !== updatedOrder._id);
        }
        return prev.map((o) => (o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
      });
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await ApiService.updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.log('Error updating status:', error);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border-l-4 border-l-yellow-500">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-2xl font-black text-gray-900">Table {item.tableNumber}</Text>
        <View className="bg-gray-100 px-3 py-1 rounded-full">
          <Text className="text-sm font-bold text-gray-700">{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mb-4">
        {new Date(item.placedAt).toLocaleTimeString()}
      </Text>

      {item.orderNotes && (
        <View className="bg-red-50 p-3 rounded-lg mb-4">
          <Text className="text-red-800 font-bold">NOTE: {item.orderNotes}</Text>
        </View>
      )}

      <View className="flex-1 mb-4">
        {item.items.map((orderItem, index) => (
          <View key={index} className="mb-3 border-b border-gray-100 pb-2">
            <Text className="text-lg font-bold text-gray-900">
              {orderItem.quantity}x {orderItem.name}
            </Text>
            {orderItem.modifiers.map((m, i) => (
              <Text key={`m-${i}`} className="text-sm text-gray-600 ml-4">
                • {m.name}
              </Text>
            ))}
            {orderItem.addOns.map((a, i) => (
              <Text key={`a-${i}`} className="text-sm text-gray-600 ml-4">
                + {a.name}
              </Text>
            ))}
            {orderItem.itemNotes && (
              <Text className="text-sm text-red-500 italic ml-4">Note: {orderItem.itemNotes}</Text>
            )}
          </View>
        ))}
      </View>

      <View className="flex-row justify-end space-x-2">
        {item.status === 'accepted' && (
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item._id, 'preparing')}
            className="bg-yellow-500 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-bold text-lg">Start Prep</Text>
          </TouchableOpacity>
        )}
        {item.status === 'preparing' && (
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item._id, 'ready')}
            className="bg-green-500 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-bold text-lg">Mark Ready</Text>
          </TouchableOpacity>
        )}
        {item.status === 'new' && (
          <Text className="text-gray-400 italic">Waiting for acceptance</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View className="flex-row items-center justify-between px-6 py-4 bg-white shadow-sm z-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="close" size={28} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-gray-900">Kitchen Display</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-2"></View>
          <Text className="text-gray-600 font-semibold">{orders.length} Active Tickets</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Icon name="checkmark-circle-outline" size={80} color="#D1D5DB" />
              <Text className="text-gray-500 text-xl font-bold mt-4">All caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
