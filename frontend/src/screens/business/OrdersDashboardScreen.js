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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import useOrderSocket from '../../hooks/useOrderSocket';

export default function OrdersDashboardScreen({ navigation, route }) {
  const { businessId } = route.params;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // active | past

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchOrders = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await ApiService.getBusinessOrders(businessId, {
        status: activeTab === 'active' ? 'active' : 'delivered',
        page: pageNum,
        limit: 20,
      });
      if (response.success) {
        if (pageNum === 1) {
          setOrders(response.data);
        } else {
          setOrders((prev) => [...prev, ...response.data]);
        }
        setHasMore(response.data.length === 20 && response.total > pageNum * 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.log('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  useOrderSocket({
    businessId,
    onNewOrder: (order) => {
      // Vibrate on new order (Pattern: 500ms vibrate, 200ms pause, 500ms vibrate)
      Vibration.vibrate([0, 500, 200, 500]);

      if (activeTab === 'active') {
        setOrders((prev) => [order, ...prev]);
      }
    },
    onOrderStatusUpdated: (updatedOrder) => {
      setOrders((prev) => {
        if (
          activeTab === 'active' &&
          (updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled')
        ) {
          return prev.filter((o) => o._id !== updatedOrder._id);
        }
        return prev.map((o) => (o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
      });
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(1);
  }, [activeTab]);

  const loadMore = () => {
    if (!loadingMore && hasMore && activeTab === 'past' && !searchQuery) {
      fetchOrders(page + 1);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-700';
      case 'accepted':
        return 'bg-purple-100 text-purple-700';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-700';
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'delivered':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (order.orderNumber && order.orderNumber.toLowerCase().includes(lowerQuery)) ||
      (order.customerName && order.customerName.toLowerCase().includes(lowerQuery)) ||
      (order.tableNumber && order.tableNumber.toString().includes(lowerQuery))
    );
  });

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('OrderDetail', { orderId: item._id, businessId })}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-bold text-gray-900">Table {item.tableNumber}</Text>
          <Text className="text-sm text-gray-500">
            {item.customerName} • {item.orderNumber}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status).split(' ')[0]}`}>
          <Text
            className={`text-xs font-bold capitalize ${getStatusColor(item.status).split(' ')[1]}`}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View className="border-t border-gray-50 pt-2 mt-1">
        <Text className="text-sm text-gray-700" numberOfLines={1}>
          {item.items?.length || 0} items • ${item.billing?.grandTotal?.toFixed(2) || '0.00'}
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          Placed at{' '}
          {new Date(item.placedAt || item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">Orders Dashboard</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderAnalytics', { businessId })}
            className="mr-4"
          >
            <Icon name="stats-chart" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('KitchenView', { businessId })}>
            <Icon name="restaurant" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="bg-white/20 rounded-xl flex-row items-center px-3 mb-4">
          <Icon name="search" size={20} color="#FFF" />
          <React.Fragment>
            {/* Using a React Native TextInput directly inline instead of importing to avoid duplicate import issues */}
            <React.Fragment>
              {React.createElement(require('react-native').TextInput, {
                className: 'flex-1 text-white py-3 px-2 h-12',
                placeholder: 'Search orders, names, tables...',
                placeholderTextColor: 'rgba(255,255,255,0.6)',
                value: searchQuery,
                onChangeText: setSearchQuery,
              })}
            </React.Fragment>
          </React.Fragment>
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Custom Tabs */}
        <View className="flex-row bg-white/20 rounded-xl p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('active')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'active' ? 'bg-white' : ''}`}
          >
            <Text
              className={`font-semibold ${activeTab === 'active' ? 'text-[#6C47FF]' : 'text-white'}`}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('past')}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'past' ? 'bg-white' : ''}`}
          >
            <Text
              className={`font-semibold ${activeTab === 'past' ? 'text-[#6C47FF]' : 'text-white'}`}
            >
              Past
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={COLORS.primary} className="py-4" />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-10">
              <Icon name="receipt-outline" size={60} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4">No {activeTab} orders found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
