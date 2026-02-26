import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, Image, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getCoupons } from '../../store/slices/couponSlice';
import COLORS from '../../config/colors';

export default function CouponsScreen() {
  const dispatch = useDispatch();
  const { coupons, loading } = useSelector((state) => state.coupon);
  const [selectedCoupon, setSelectedCoupon] = React.useState(null);

  useEffect(() => {
    dispatch(getCoupons({ status: 'active' }));
  }, []);

  const renderCoupon = ({ item }) => {
    const isExpired = new Date(item.validUntil) < new Date();
    const hoursLeft = Math.max(0, Math.floor((new Date(item.validUntil) - new Date()) / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor(((new Date(item.validUntil) - new Date()) % (1000 * 60 * 60)) / (1000 * 60)));

    return (
      <TouchableOpacity
        onPress={() => setSelectedCoupon(item)}
        className={`bg-white rounded-2xl p-5 mb-4 shadow-lg ${isExpired ? 'opacity-50' : ''}`}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {item.business?.name || 'Business'}
            </Text>
            <View className="rounded-full px-3 py-1 self-start mb-2" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-xs font-bold" style={{ color: COLORS.secondary }}>{item.code}</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-800 mb-1">{item.title}</Text>
          </View>
          <View className="bg-green-100 rounded-full w-16 h-16 items-center justify-center">
            <Text className="text-xl font-bold text-green-700">
              {item.rewardType === 'percentage' ? `${item.rewardValue}%` :
                item.rewardType === 'fixed' ? `₹${item.rewardValue}` : 'FREE'}
            </Text>
          </View>
        </View>

        <Text className="text-sm text-gray-600 mb-3">{item.description}</Text>

        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <Icon name="time-outline" size={16} color={hoursLeft < 1 ? '#EF4444' : '#6B7280'} />
            <Text className={`text-xs ml-1 font-semibold ${hoursLeft < 1 ? 'text-red-600' : 'text-gray-600'}`}>
              {isExpired ? 'Expired' : `${hoursLeft}h ${minutesLeft}m left`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedCoupon(item)}>
            <View className="flex-row items-center">
              <Icon name="qr-code-outline" size={16} color={COLORS.secondary} />
              <Text className="text-xs font-semibold ml-1" style={{ color: COLORS.secondary }}>Show QR</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6 rounded-b-3xl"
      >
        <Text className="text-white text-2xl font-bold mb-2">My Coupons</Text>
        <Text className="text-white opacity-90">
          {coupons.length} active {coupons.length === 1 ? 'coupon' : 'coupons'}
        </Text>
      </LinearGradient>

      <View className="flex-1 px-6 mt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.secondary} />
          </View>
        ) : coupons.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Icon name="gift-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">
              No active coupons
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Write reviews to earn rewards!
            </Text>
          </View>
        ) : (
          <FlatList
            data={coupons}
            renderItem={renderCoupon}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>


      {/* QR Code Modal - Redesigned */}
      {selectedCoupon && (
        <TouchableOpacity
          onPress={() => setSelectedCoupon(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
          activeOpacity={1}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: 0, width: '100%', height: '100%', overflow: 'hidden' }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                className="p-10 pb-2"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-white text-2xl font-bold flex-1">
                    {selectedCoupon.business?.name || 'Business'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedCoupon(null)}
                    className="ml-2"
                  >
                    <Icon name="close-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Coupon Code & Title */}
                <View className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 items-center">
                  {selectedCoupon.title && (
                    <Text className="text-white font-bold text-sm mb-1">{selectedCoupon.title}</Text>
                  )}
                  <Text className="text-white/80 text-xs mb-1">Coupon Code</Text>
                  <Text className="text-white text-2xl font-bold tracking-wider">
                    {selectedCoupon.code}
                  </Text>
                </View>
              </LinearGradient>

              <View className="overflow-hidden bg-white">
                {/* QR Code Section - PROMINENT */}
                <View className="mb-4 items-center bg-gray-50 pt-2 pb-2">
                  <View className="bg-white p-5 rounded-3xl shadow-lg items-center border-[3px]" style={{ borderColor: COLORS.secondary }}>
                    <QRCode
                      value={selectedCoupon.qrCodeData || JSON.stringify({
                        type: 'coupon',
                        couponId: selectedCoupon._id,
                        code: selectedCoupon.code,
                        businessId: selectedCoupon.business?._id,
                        userId: selectedCoupon.user
                      })}
                      size={200}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>

                  <Text className="text-center text-xs text-gray-500 mt-3">
                    Show this QR code to the business owner
                  </Text>
                </View>

                {/* Discount Badge */}
                <View className="px-6 mb-4">
                  <View className="bg-green-50 rounded-2xl p-3 items-center border border-green-200 shadow-sm">
                    <Text className="text-sm text-green-600 font-semibold mb-1 uppercase tracking-wider">Your Discount</Text>
                    <Text className="text-3xl font-extrabold text-green-700 text-center">
                      {selectedCoupon.rewardType === 'percentage'
                        ? `${selectedCoupon.rewardValue}% OFF`
                        : selectedCoupon.rewardType === 'fixed'
                          ? `₹${selectedCoupon.rewardValue} OFF`
                          : selectedCoupon.rewardType === 'free_item' || selectedCoupon.rewardType === 'free_drink'
                            ? `Free ${selectedCoupon.itemName || 'Item'}`
                            : `${selectedCoupon.rewardValue}% OFF`}
                    </Text>
                    {selectedCoupon.minPurchaseAmount > 0 && (
                      <Text className="text-xs text-green-800 mt-1">Min. Purchase: ₹{selectedCoupon.minPurchaseAmount}</Text>
                    )}
                    {selectedCoupon.maxDiscountAmount > 0 && selectedCoupon.rewardType === 'percentage' && (
                      <Text className="text-xs text-green-800">Max Discount: ₹{selectedCoupon.maxDiscountAmount}</Text>
                    )}
                  </View>
                </View>

                {/* Business Info - Compact */}
                <View className="px-6 pb-4">
                  <Text className="text-sm font-bold text-gray-900 mb-3">Business Info</Text>

                  {selectedCoupon.business?.address?.fullAddress && (
                    <View className="flex-row items-start mb-2">
                      <Icon name="location" size={16} color={COLORS.secondary} />
                      <Text className="text-xs text-gray-600 ml-2 flex-1">
                        {selectedCoupon.business.address.fullAddress}
                      </Text>
                    </View>
                  )}

                  {selectedCoupon.business?.phone && (
                    <View className="flex-row items-center mb-2">
                      <Icon name="call" size={16} color={COLORS.secondary} />
                      <Text className="text-xs text-gray-600 ml-2">
                        {selectedCoupon.business.phone}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center">
                    <Icon name="time" size={16} color="#EF4444" />
                    <Text className="text-xs text-red-600 ml-2 font-semibold">
                      Valid until {new Date(selectedCoupon.validUntil).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Terms - Compact */}
                {selectedCoupon.terms && (
                  <View className="px-6 pb-4">
                    <Text className="text-xs text-gray-400 italic">
                      {selectedCoupon.terms}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

