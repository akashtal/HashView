import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

const screenWidth = Dimensions.get('window').width;

export default function OrderAnalyticsScreen({ navigation, route }) {
  const { businessId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('weekly'); // daily, weekly, monthly
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = async () => {
    try {
      // Use the newly created api service method
      const response = await ApiService.getOrderAnalytics(businessId, timeframe);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.log('Error fetching order analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [timeframe]);

  const renderTimeframeToggle = () => (
    <View className="flex-row bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 mx-4">
      {['daily', 'weekly', 'monthly'].map((tf) => (
        <TouchableOpacity
          key={tf}
          onPress={() => setTimeframe(tf)}
          className={`flex-1 py-2 rounded-lg items-center ${timeframe === tf ? 'bg-[#5b21b6]' : 'bg-transparent'}`}
        >
          <Text
            className={`font-bold capitalize ${timeframe === tf ? 'text-white' : 'text-gray-500'}`}
          >
            {tf}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => {
    if (!analytics) return null;

    return (
      <View className="flex-row justify-between mx-4 mb-6">
        <LinearGradient
          colors={['#4c1d95', '#6d28d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1 rounded-2xl p-4 mr-2 shadow-sm"
        >
          <Text className="text-white/80 text-xs font-semibold mb-1">Total Revenue</Text>
          <Text className="text-white text-xl font-black">
            ${analytics.totalRevenue?.toFixed(2) || '0.00'}
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#047857', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1 rounded-2xl p-4 mx-1 shadow-sm"
        >
          <Text className="text-white/80 text-xs font-semibold mb-1">Total Orders</Text>
          <Text className="text-white text-xl font-black">{analytics.totalOrders || 0}</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#b45309', '#d97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1 rounded-2xl p-4 ml-2 shadow-sm"
        >
          <Text className="text-white/80 text-xs font-semibold mb-1">Avg Value</Text>
          <Text className="text-white text-xl font-black">
            ${analytics.averageOrderValue?.toFixed(2) || '0.00'}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderRevenueChart = () => {
    if (!analytics?.timeSeries || analytics.timeSeries.length === 0) {
      return (
        <View className="bg-white rounded-2xl p-6 mx-4 mb-6 shadow-sm border border-gray-100 items-center justify-center h-48">
          <Icon name="stats-chart-outline" size={48} color="#e5e7eb" />
          <Text className="text-gray-400 mt-2 font-medium">No revenue data for this timeframe</Text>
        </View>
      );
    }

    const labels = analytics.timeSeries.map((item) => {
      const d = new Date(item._id);
      return timeframe === 'monthly'
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getDate()}/${d.getMonth() + 1}`;
    });
    const data = analytics.timeSeries.map((item) => item.revenue);

    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mb-6 shadow-sm border border-gray-100">
        <Text className="text-gray-800 font-bold text-lg mb-4">Revenue Trend</Text>
        <LineChart
          data={{
            labels:
              labels.length > 7
                ? labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0)
                : labels, // Max 7 labels
            datasets: [{ data }],
          }}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(109, 40, 217, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: '4', strokeWidth: '2', stroke: '#4c1d95' },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>
    );
  };

  const renderStatusBreakdown = () => {
    if (!analytics?.statusBreakdown) return null;
    const stats = analytics.statusBreakdown;

    const statuses = [
      { key: 'new', label: 'New', color: 'bg-blue-500', count: stats.new },
      { key: 'accepted', label: 'Accepted', color: 'bg-purple-500', count: stats.accepted },
      { key: 'preparing', label: 'Preparing', color: 'bg-yellow-500', count: stats.preparing },
      { key: 'ready', label: 'Ready', color: 'bg-green-500', count: stats.ready },
      { key: 'delivered', label: 'Delivered', color: 'bg-gray-500', count: stats.delivered },
      { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500', count: stats.cancelled },
    ];

    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mb-6 shadow-sm border border-gray-100">
        <Text className="text-gray-800 font-bold text-lg mb-4">Order Status Breakdown</Text>
        <View className="flex-row flex-wrap">
          {statuses.map((s) => (
            <View key={s.key} className="w-1/3 mb-4 items-center">
              <View
                className={`w-12 h-12 rounded-full ${s.color} items-center justify-center mb-2 shadow-sm`}
              >
                <Text className="text-white font-bold text-lg">{s.count || 0}</Text>
              </View>
              <Text className="text-gray-600 text-xs font-medium">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPopularItems = () => {
    if (!analytics?.popularItems || analytics.popularItems.length === 0) return null;

    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mb-6 shadow-sm border border-gray-100">
        <Text className="text-gray-800 font-bold text-lg mb-4">Popular Items</Text>
        {analytics.popularItems.map((item, index) => (
          <View
            key={item._id}
            className="flex-row justify-between items-center mb-3 border-b border-gray-50 pb-2"
          >
            <View className="flex-row items-center">
              <Text className="text-gray-400 font-bold mr-3">#{index + 1}</Text>
              <Text className="text-gray-700 font-medium">{item._id}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-900 font-bold">{item.quantityOrdered} ordered</Text>
              <Text className="text-gray-400 text-xs">${item.revenue.toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPeakHours = () => {
    if (!analytics?.peakHours || analytics.peakHours.length === 0) return null;

    // Build a simple 24-hour heatmap array
    const hoursArray = Array(24).fill(0);
    analytics.peakHours.forEach((ph) => {
      hoursArray[ph._id] = ph.orderCount;
    });

    const maxOrders = Math.max(...hoursArray);

    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mb-6 shadow-sm border border-gray-100">
        <Text className="text-gray-800 font-bold text-lg mb-4">Peak Hours (Orders)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {hoursArray.map((count, hour) => {
            if (count === 0 && maxOrders > 0) return null; // Skip empty hours to save space

            // Calculate opacity based on max (minimum 0.1 for visibility)
            const opacity = maxOrders > 0 ? Math.max(0.1, count / maxOrders) : 0.1;

            return (
              <View key={hour} className="items-center mr-2">
                <View
                  className="w-10 rounded-md bg-purple-600 justify-end items-center mb-1 pb-1"
                  style={{ height: 100, opacity }}
                >
                  <Text className="text-white text-xs font-bold">{count}</Text>
                </View>
                <Text className="text-gray-500 text-xs">{hour}:00</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTableStats = () => {
    if (!analytics?.tableStats || analytics.tableStats.length === 0) return null;

    return (
      <View className="bg-white rounded-2xl p-4 mx-4 mb-6 shadow-sm border border-gray-100">
        <Text className="text-gray-800 font-bold text-lg mb-4">Top Tables by Revenue</Text>
        {analytics.tableStats.map((item, index) => (
          <View key={item._id} className="flex-row justify-between items-center mb-3">
            <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center">
              <Text className="text-blue-700 font-bold">{item._id}</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-gray-700 font-medium">{item.orders} orders</Text>
            </View>
            <Text className="text-green-600 font-bold">${item.revenue.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleExportCSV = async () => {
    try {
      Alert.alert('Export CSV', `Exporting ${timeframe} orders to CSV...`);
      // Since it's React Native, a blob download is tricky directly to file system without expo-file-system.
      // But we can trigger the API call.
      const response = await ApiService.exportOrdersCSV(businessId, timeframe);
      if (response) {
        Alert.alert(
          'Success',
          'CSV generated. Check backend server logs or use a browser/Postman to download.'
        );
      }
    } catch (error) {
      console.log('Export error:', error);
      Alert.alert('Error', 'Failed to export CSV.');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-1">
            <Icon name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Order Analytics</Text>
        </View>
        <TouchableOpacity
          onPress={handleExportCSV}
          className="bg-purple-100 px-3 py-1.5 rounded-lg flex-row items-center"
        >
          <Icon name="download-outline" size={18} color="#6d28d9" />
          <Text className="text-purple-700 font-semibold text-xs ml-1">Export</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 pt-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {renderTimeframeToggle()}
          {renderSummaryCards()}
          {renderRevenueChart()}
          {renderPopularItems()}
          {renderPeakHours()}
          {renderTableStats()}
          {renderStatusBreakdown()}
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
