import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getUserReviews } from '../../store/slices/reviewSlice';
import { getRewardHistory } from '../../store/slices/couponSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

// ── Order History Card ────────────────────────────────────────────────────────
function OrderHistoryCard({ item, onRepeat }) {
  const currency =
    item.items?.[0]?.currency === 'GBP' ? '£' : item.items?.[0]?.currency === 'USD' ? '$' : '₹';

  const statusStyle = {
    delivered: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle' },
    new: { bg: '#DBEAFE', text: '#1E40AF', icon: 'time-outline' },
    accepted: { bg: '#EDE9FE', text: '#5B21B6', icon: 'checkmark-circle-outline' },
    preparing: { bg: '#FEF3C7', text: '#92400E', icon: 'flame-outline' },
    ready: { bg: '#D1FAE5', text: '#065F46', icon: 'fast-food-outline' },
  };
  const s = statusStyle[item.status] || { bg: '#F3F4F6', text: '#374151', icon: 'ellipse' };

  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderRadius: 18,
        marginBottom: 12,
        shadowColor: '#6C47FF',
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      {/* Restaurant + status row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#EEF2FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon name="restaurant" size={21} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: '#111827' }} numberOfLines={1}>
            {item.business?.name || 'Restaurant'}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {new Date(item.placedAt || item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: s.bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 5,
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
      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
        <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }} numberOfLines={2}>
          {item.items?.map((i) => `${i.quantity}× ${i.name}`).join('  ·  ')}
        </Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
          Table {item.tableNumber} • {item.orderNumber}
        </Text>
      </View>

      {/* Footer: total + repeat */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>Total Paid</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 1 }}>
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
              shadowColor: COLORS.primary,
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
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

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ item }) {
  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 12,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            {item.business?.name || 'Business'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[...Array(5)].map((_, i) => (
              <Icon key={i} name="star" size={14} color={i < item.rating ? '#F59E0B' : '#E5E7EB'} />
            ))}
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {item.couponAwarded && (
          <View
            style={{
              backgroundColor: '#D1FAE5',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '700' }}>
              🎁 Coupon Earned
            </Text>
          </View>
        )}
      </View>
      {item.comment ? (
        <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 19 }}>{item.comment}</Text>
      ) : null}
    </View>
  );
}

// ── Reward card ────────────────────────────────────────────────────────────────
function RewardCard({ item }) {
  const bgMap = { active: '#D1FAE5', redeemed: '#DBEAFE', expired: '#F3F4F6' };
  const textMap = { active: '#065F46', redeemed: '#1E40AF', expired: '#6B7280' };
  const bg = bgMap[item.status] || '#FEE2E2';
  const text = textMap[item.status] || '#991B1B';

  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 12,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#FFF9F0',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon name="gift" size={20} color={COLORS.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }}>
            {item.business?.name || 'Business'}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.secondary, fontWeight: '600', marginTop: 2 }}>
            {item.code}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: bg,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{ fontSize: 11, fontWeight: '700', color: text, textTransform: 'capitalize' }}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{item.description}</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Valid until:{' '}
          {item.validUntil ? new Date(item.validUntil).toLocaleDateString() : 'No expiry'}
        </Text>
        {item.rewardType === 'discount_percentage' && (
          <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.secondary }}>
            {item.rewardValue}% OFF
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation }) {
  const dispatch = useDispatch();
  const { userReviews, loading: reviewLoading } = useSelector((state) => state.review);
  const { rewards, loading: rewardLoading } = useSelector((state) => state.coupon);
  const [activeTab, setActiveTab] = React.useState('orders');
  const [orders, setOrders] = React.useState([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const resp = await ApiService.getMyOrders();
      if (resp.success) {
        setOrders((resp.data || []).filter((o) => ['delivered', 'cancelled'].includes(o.status)));
      }
    } catch (e) {
      /* silent */
    } finally {
      setOrdersLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'orders') fetchOrders();
      else if (activeTab === 'reviews') dispatch(getUserReviews({ page: 1, limit: 20 }));
      else dispatch(getRewardHistory({ page: 1, limit: 20 }));
    }, [activeTab])
  );

  const handleRepeatOrder = (order) => {
    Alert.alert('Repeat Order', `Go to ${order.business?.name} to re-order the same items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Go to Menu',
        style: 'default',
        onPress: () => {
          if (navigation) {
            navigation.navigate('Home', {
              screen: 'BusinessDetail',
              params: { businessId: order.business?._id },
            });
          }
        },
      },
    ]);
  };

  const TABS = [
    { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
    { key: 'reviews', label: 'Reviews', icon: 'chatbubbles-outline' },
    { key: 'rewards', label: 'Rewards', icon: 'gift-outline' },
  ];

  const isLoading =
    activeTab === 'orders'
      ? ordersLoading
      : activeTab === 'reviews'
        ? reviewLoading
        : rewardLoading;

  const data = activeTab === 'orders' ? orders : activeTab === 'reviews' ? userReviews : rewards;

  const emptyIcon =
    activeTab === 'orders'
      ? 'receipt-outline'
      : activeTab === 'reviews'
        ? 'chatbubbles-outline'
        : 'gift-outline';
  const emptyText =
    activeTab === 'orders'
      ? 'No past orders yet'
      : activeTab === 'reviews'
        ? 'No reviews yet'
        : 'No rewards yet';
  const emptySubText =
    activeTab === 'orders'
      ? 'Complete an order to see it here'
      : activeTab === 'reviews'
        ? 'Review a business to earn coupons!'
        : 'Leave reviews to earn reward coupons';

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 0 }}
      >
        <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>
          My History
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 18 }}>
          Orders, reviews & rewards in one place
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: 4,
          }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                backgroundColor: activeTab === tab.key ? '#FFF' : 'transparent',
              }}
            >
              <Icon
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? COLORS.primary : 'rgba(255,255,255,0.75)'}
              />
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 12,
                  marginLeft: 5,
                  color: activeTab === tab.key ? COLORS.primary : 'rgba(255,255,255,0.75)',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 14 }} />
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : data.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
        >
          <Icon name={emptyIcon} size={72} color="#D1D5DB" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 }}>
            {emptyText}
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
            {emptySubText}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            if (activeTab === 'orders')
              return <OrderHistoryCard item={item} onRepeat={handleRepeatOrder} />;
            if (activeTab === 'reviews') return <ReviewCard item={item} />;
            return <RewardCard item={item} />;
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
