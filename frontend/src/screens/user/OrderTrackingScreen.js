import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../../services/api.service';
import useOrderSocket from '../../hooks/useOrderSocket';
import COLORS from '../../config/colors';

// ── Status pipeline (Zomato-style) ──────────────────────────────────────────
const PIPELINE = [
  { key: 'new', label: 'Order Placed', icon: 'receipt-outline', color: '#3B82F6' },
  { key: 'accepted', label: 'Confirmed', icon: 'checkmark-circle', color: '#8B5CF6' },
  { key: 'preparing', label: 'Preparing', icon: 'flame', color: '#F59E0B' },
  { key: 'ready', label: 'Ready', icon: 'fast-food', color: '#10B981' },
  { key: 'delivered', label: 'Served!', icon: 'happy', color: '#059669' },
];

const STATUS_INDEX = { new: 0, accepted: 1, preparing: 2, ready: 3, delivered: 4 };

// ── Pulsing dot for "in-progress" step ──────────────────────────────────────
function PulseDot({ color }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: color,
        transform: [{ scale: anim }],
        shadowColor: color,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
      }}
    />
  );
}

// ── Live progress tracker card ───────────────────────────────────────────────
function LiveTracker({ order }) {
  const currentIdx = STATUS_INDEX[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';

  const currency = '£';

  return (
    <View
      style={{
        margin: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {/* Header gradient */}
      <LinearGradient
        colors={isCancelled ? ['#EF4444', '#DC2626'] : ['#6C47FF', '#4C35B5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ padding: 20 }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 12,
                fontWeight: '600',
                marginBottom: 2,
              }}
            >
              {order.business?.name || 'Restaurant'}
            </Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
              {isCancelled ? '❌ Order Cancelled' : 'Live Order Tracking'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 }}>
              {order.orderNumber} • Table {order.tableNumber} • {order.items?.length || 0} items
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>
              {currency}
              {order.billing?.grandTotal?.toFixed(2)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Progress pipeline */}
      {!isCancelled && (
        <View style={{ backgroundColor: '#FFF', padding: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            {PIPELINE.map((step, idx) => {
              const done = idx < currentIdx;
              const current = idx === currentIdx;
              const pending = idx > currentIdx;
              const isLast = idx === PIPELINE.length - 1;

              return (
                <React.Fragment key={step.key}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    {/* Circle */}
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        marginBottom: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: done || current ? step.color : '#F3F4F6',
                      }}
                    >
                      {current ? (
                        <PulseDot color="#FFF" />
                      ) : (
                        <Icon
                          name={done ? 'checkmark' : step.icon}
                          size={18}
                          color={done ? '#FFF' : pending ? '#9CA3AF' : '#FFF'}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: current ? '800' : '500',
                        textAlign: 'center',
                        color: done || current ? step.color : '#9CA3AF',
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>

                  {/* Connector line */}
                  {!isLast && (
                    <View
                      style={{
                        flex: 0.6,
                        height: 3,
                        marginTop: 17,
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: '#F3F4F6',
                      }}
                    >
                      <View
                        style={{
                          height: '100%',
                          width: done ? '100%' : '0%',
                          backgroundColor: PIPELINE[idx].color,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Items summary */}
          <View
            style={{ marginTop: 16, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12 }}
          >
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6 }}>
              ORDER ITEMS
            </Text>
            {order.items?.map((item, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}
              >
                <Text style={{ fontSize: 13, color: '#374151' }}>
                  {item.quantity}× {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  {currency}
                  {item.itemTotal?.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <View style={{ backgroundColor: '#FFF', padding: 20, alignItems: 'center' }}>
          <Icon name="close-circle" size={60} color="#EF4444" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 }}>
            This order was cancelled
          </Text>
          {order.cancelReason && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' }}>
              Reason: {order.cancelReason}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Past order card with Repeat Order ───────────────────────────────────────
function PastOrderCard({ item, onRepeat }) {
  const currency = '£';

  const statusColors = {
    delivered: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle' },
  };
  const s = statusColors[item.status] || { bg: '#F3F4F6', text: '#374151', icon: 'ellipse' };

  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#EEF2FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon name="restaurant" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }} numberOfLines={1}>
            {item.business?.name || 'Restaurant'}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
            {item.orderNumber} •{' '}
            {new Date(item.placedAt || item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: s.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Icon name={s.icon} size={12} color={s.text} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: s.text,
              marginLeft: 4,
              textTransform: 'uppercase',
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>

      {/* Items */}
      <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
        <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }} numberOfLines={2}>
          {item.items?.map((i) => `${i.quantity}× ${i.name}`).join('  ·  ')}
        </Text>
      </View>

      {/* Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
        }}
      >
        <View>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Total paid</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.primary }}>
            {currency}
            {item.billing?.grandTotal?.toFixed(2)}
          </Text>
        </View>
        {item.status === 'delivered' && (
          <TouchableOpacity
            onPress={() => onRepeat(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Icon name="refresh" size={15} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>
              Repeat Order
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function OrderTrackingScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const user = useSelector((state) => state.auth.user);

  const fetchMyOrders = useCallback(async () => {
    try {
      const response = await ApiService.getMyOrders();
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (error) {
      console.log('Error fetching my orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMyOrders();
    }, [fetchMyOrders])
  );

  // Real-time socket updates
  useOrderSocket({
    customerId: user?._id,
    onOrderStatusUpdated: (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o))
      );
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyOrders();
  }, [fetchMyOrders]);

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  const handleRepeatOrder = (order) => {
    Alert.alert(
      'Repeat Order',
      `Re-order from ${order.business?.name}?\n\nYou'll be taken to the menu to add the same items again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Menu',
          onPress: () =>
            navigation.navigate('Home', {
              screen: 'BusinessDetail',
              params: { businessId: order.business?._id },
            }),
        },
      ]
    );
  };

  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={{ paddingTop: 52, paddingBottom: 0, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginRight: 12,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>My Orders</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 }}>
              {activeOrders.length} active • {pastOrders.length} past
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: 14,
            padding: 4,
            marginBottom: -1,
          }}
        >
          {[
            { key: 'active', label: '🔴 Live Orders', count: activeOrders.length },
            { key: 'past', label: '📋 Order History', count: pastOrders.length },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: activeTab === tab.key ? '#FFF' : 'transparent',
              }}
            >
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 13,
                  color: activeTab === tab.key ? COLORS.primary : 'rgba(255,255,255,0.8)',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : displayOrders.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
        >
          <Icon
            name={activeTab === 'active' ? 'time-outline' : 'receipt-outline'}
            size={80}
            color="#D1D5DB"
          />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 }}>
            {activeTab === 'active' ? 'No active orders' : 'No past orders'}
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
            {activeTab === 'active'
              ? "When you place an order, you'll track it here in real-time!"
              : 'Your completed orders will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) =>
            activeTab === 'active' ? (
              <LiveTracker order={item} />
            ) : (
              <PastOrderCard item={item} onRepeat={handleRepeatOrder} />
            )
          }
        />
      )}
    </View>
  );
}
