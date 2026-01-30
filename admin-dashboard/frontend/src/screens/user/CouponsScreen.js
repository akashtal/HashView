import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, Image } from 'react-native';
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
            <View className="rounded-full px-3 py-1 self-start" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-xs font-bold" style={{ color: COLORS.secondary }}>{item.code}</Text>
            </View>
          </View>
          <View className="bg-green-100 rounded-full w-16 h-16 items-center justify-center">
            <Text className="text-2xl font-bold text-green-700">{item.rewardValue}%</Text>
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
          className="absolute inset-0 bg-black/60 justify-center items-center"
          activeOpacity={1}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl m-6 max-w-sm w-full overflow-hidden"
          >
            {/* Header */}
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              className="p-6 pb-2"
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

              {/* Coupon Code */}
              <View className="bg-white/20 backdrop-blur rounded-xl px-2 py-2 items-center">
                <Text className="text-white/80 text-xs mb-1">Coupon Code</Text>
                <Text className="text-white text-2xl font-bold tracking-wider">
                  {selectedCoupon.code}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView className="max-h-[100%]" showsVerticalScrollIndicator={false}>
              {/* QR Code Section - PROMINENT */}
              <View className="p-2 items-center bg-gray-50">
                <View className="bg-white p-6 rounded-2xl shadow-xl items-center border-4" style={{ borderColor: COLORS.secondary }}>
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
              <View className="px-4 pb-2">
                <View className="bg-green-50 rounded-2xl p-2 items-center border-2 border-green-200">
                  <Text className="text-xs text-green-600 mb-1">Your Discount</Text>
                  <Text className="text-3xl font-bold text-green-700">
                    {selectedCoupon.rewardType === 'percentage'
                      ? `${selectedCoupon.rewardValue}% OFF`
                      : selectedCoupon.rewardType === 'fixed'
                        ? `£${selectedCoupon.rewardValue} OFF`
                        : selectedCoupon.rewardType === 'free_item' || selectedCoupon.rewardType === 'free_drink'
                          ? `Free ${selectedCoupon.itemName || 'Item'}`
                          : `${selectedCoupon.rewardValue}% OFF`}
                  </Text>
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
            </ScrollView>

            {/* Close Button */}
            {/* <View className="px-6 py-4 border-t border-gray-100">
              <TouchableOpacity
                onPress={() => setSelectedCoupon(null)}
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: COLORS.secondary }}
              >
                <Text className="text-white font-bold text-base">Close</Text>
              </TouchableOpacity>
            </View> */}
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

