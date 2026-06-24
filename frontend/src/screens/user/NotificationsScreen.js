import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import ApiService from '../../services/api.service';
import ToastService from '../../utils/ToastService';
import COLORS from '../../config/colors';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await ApiService.getNotifications(params);
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      ToastService.showError('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [filter]);

  const markAsRead = async (notificationId) => {
    try {
      await ApiService.markAsRead(notificationId);

      // Update local state
      setNotifications(
        notifications.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );

      ToastService.showSuccess('Marked as read', '');
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await ApiService.markAllRead();

      // Update all notifications to read
      setNotifications(notifications.map((notif) => ({ ...notif, read: true })));

      ToastService.showSuccess('All notifications marked as read', '');
    } catch (error) {
      console.error('Mark all as read error:', error);
      ToastService.showError('Error', 'Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
      case 'order_placed':
        return { icon: 'restaurant', color: '#F59E0B' };
      case 'order_status':
        return { icon: 'cube', color: '#8B5CF6' };
      case 'coupon':
        return { icon: 'gift', color: '#10B981' };
      case 'review':
        return { icon: 'chatbubbles', color: '#3B82F6' };
      case 'business':
      case 'business_verification':
      case 'business_update':
        return { icon: 'business', color: '#8B5CF6' };
      case 'admin_broadcast':
      case 'announcement':
      case 'promotion':
        return { icon: 'megaphone', color: '#EF4444' };
      case 'system':
        return { icon: 'information-circle', color: '#F59E0B' };
      default:
        return { icon: 'notifications', color: COLORS.primary };
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read first
    if (notification.status !== 'read') {
      await markAsRead(notification._id);
    }

    const type = (notification.type || '').toLowerCase();
    const data = notification.data || {};

    // ── Business Owner: New Order Notification ─────────────────────────────
    // Backend sends type: 'new_order' with data.screen: 'OrdersDashboard'
    if (type === 'new_order' || data.screen === 'OrdersDashboard') {
      try {
        if (data.orderId) {
          navigation.navigate('OrderDetail', { orderId: data.orderId });
        } else {
          navigation.navigate('OrdersDashboard');
        }
      } catch {
        // If screen is not in current stack (e.g. user viewing from profile tab),
        // navigate to the business tab root first
        navigation.navigate('OrdersDashboard');
      }
      return;
    }

    // ── Customer: Order Status Update Notification ─────────────────────────
    // Backend sends type: 'order_status' with data.screen: 'OrderTracking'
    if (type === 'order_status' || type === 'order_placed' || data.screen === 'OrderTracking') {
      try {
        if (data.orderId) {
          navigation.navigate('OrderTracking', { orderId: data.orderId });
        }
      } catch {
        // already on OrderTracking or unavailable
      }
      return;
    }

    // ── Business Verification / Business Update ────────────────────────────
    if (type === 'business_verification' || type === 'kyc' || type === 'business_update' || type === 'business') {
      navigation.navigate('BusinessDashboard');
      return;
    }

    // ── Coupon ─────────────────────────────────────────────────────────────
    if (type === 'coupon' || type === 'promotion') {
      if (data.businessId) {
        navigation.navigate('BusinessDetail', { businessId: data.businessId });
      }
      return;
    }

    // ── Review ─────────────────────────────────────────────────────────────
    if (type === 'review') {
      if (data.businessId) {
        navigation.navigate('BusinessDetail', { businessId: data.businessId });
      }
      return;
    }

    // ── Generic: Navigate to business if businessId present ───────────────
    if (data.businessId) {
      navigation.navigate('BusinessDetail', { businessId: data.businessId });
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} min ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold">Notifications</Text>
              {unreadCount > 0 && (
                <Text className="text-white/80 text-sm mt-1">
                  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="px-4 py-2 bg-white/20 rounded-full"
            >
              <Text className="text-white text-sm font-semibold">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-white/10 rounded-full p-1">
          {['all', 'unread', 'read'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setFilter(filterType)}
              className={`flex-1 py-2 rounded-full ${filter === filterType ? 'bg-white' : ''}`}
            >
              <Text
                className={`text-center font-semibold capitalize ${
                  filter === filterType ? 'text-gray-900' : 'text-white'
                }`}
              >
                {filterType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Notifications List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-gray-500 mt-4">Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Icon name="notifications-off-outline" size={80} color="#D1D5DB" />
          <Text className="text-xl font-bold text-gray-900 mt-4">No Notifications</Text>
          <Text className="text-gray-500 text-center mt-2">
            {filter === 'unread'
              ? "You're all caught up! No unread notifications."
              : filter === 'read'
                ? 'No read notifications yet.'
                : "You'll see notifications here when you receive them."}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          <View className="px-6 py-4">
            {notifications.map((notification, index) => {
              const iconData = getNotificationIcon(notification.type);

              return (
                <TouchableOpacity
                  key={notification._id || index}
                  onPress={() => handleNotificationPress(notification)}
                  className={`bg-white rounded-2xl p-4 mb-3 shadow-sm ${
                    notification.status !== 'read' ? 'border-l-4' : ''
                  }`}
                  style={notification.status !== 'read' ? { borderLeftColor: iconData.color } : {}}
                >
                  <View className="flex-row">
                    {/* Icon */}
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${iconData.color}15` }}
                    >
                      <Icon name={iconData.icon} size={24} color={iconData.color} />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-bold text-gray-900 flex-1">
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View
                            className="w-2 h-2 rounded-full ml-2"
                            style={{ backgroundColor: iconData.color }}
                          />
                        )}
                      </View>

                      <Text className="text-sm text-gray-600 mb-2">{notification.message}</Text>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-gray-400">
                          {formatTimestamp(notification.createdAt)}
                        </Text>

                        {/* Show actionable hint for order notifications */}
                        {(notification.type === 'new_order' || notification.type === 'order_placed' || notification.type === 'order_status') ? (
                          <View
                            className="flex-row items-center px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${iconData.color}15` }}
                          >
                            <Text
                              className="text-xs font-semibold mr-1"
                              style={{ color: iconData.color }}
                            >
                              Tap to view
                            </Text>
                            <Icon name="chevron-forward" size={12} color={iconData.color} />
                          </View>
                        ) : notification.data?.type ? (
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: `${iconData.color}15` }}
                          >
                            <Text
                              className="text-xs font-medium capitalize"
                              style={{ color: iconData.color }}
                            >
                              {notification.data.type}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
