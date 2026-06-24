import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../../config/colors';

const UpdatesTab = ({ loadingUpdates, updates }) => {
  return (
    <View>
      {loadingUpdates ? (
        <View className="items-center py-10">
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text className="text-gray-400 mt-3">Loading updates...</Text>
        </View>
      ) : updates.length === 0 ? (
        <View className="items-center py-10">
          <Icon name="megaphone-outline" size={64} color="#D1D5DB" />
          <Text className="text-gray-400 mt-4 text-[15px]">No updates yet</Text>
          <Text className="text-gray-300 text-[13px] mt-1">Check back later for offers!</Text>
        </View>
      ) : (
        updates.map((update) => (
          <View key={update._id} className="mb-5 bg-white rounded-3xl overflow-hidden shadow-lg">
            {update.image?.url && (
              <View className="relative">
                <Image
                  source={{ uri: update.image.url }}
                  className="w-full h-[200px]"
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  className="absolute bottom-0 left-0 right-0 h-20"
                />
                {/* Type Badge on Image */}
                <View
                  className="absolute top-4 right-4 rounded-full px-3.5 py-2 flex-row items-center shadow-md"
                  style={{
                    backgroundColor: update.type === 'offer' ? COLORS.secondary : COLORS.primary,
                  }}
                >
                  <Icon
                    name={update.type === 'offer' ? 'pricetag' : 'megaphone'}
                    size={14}
                    color="#FFF"
                  />
                  <Text className="text-white text-[11px] font-bold uppercase ml-1">
                    {update.type}
                  </Text>
                </View>
              </View>
            )}

            <View className="p-5">
              {/* Date Badge if no image */}
              {!update.image?.url && (
                <View className="flex-row justify-between items-center mb-3">
                  <View
                    className="rounded-full px-3.5 py-2 flex-row items-center"
                    style={{
                      backgroundColor: update.type === 'offer' ? COLORS.secondary : COLORS.primary,
                    }}
                  >
                    <Icon
                      name={update.type === 'offer' ? 'pricetag' : 'megaphone'}
                      size={14}
                      color="#FFF"
                    />
                    <Text className="text-white text-[11px] font-bold uppercase ml-1">
                      {update.type}
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-3 py-1.5 rounded-lg">
                    <Text className="text-[11px] text-gray-600 font-semibold">
                      {new Date(update.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              )}

              <Text className="text-[19px] font-bold text-gray-900 mb-2.5 leading-6">
                {update.title}
              </Text>
              <Text className="text-[15px] text-gray-600 leading-6 mb-3">
                {update.description}
              </Text>

              {/* Offer Details */}
              {update.type === 'offer' && update.discountValue > 0 && (
                <LinearGradient
                  colors={
                    update.type === 'offer' ? ['#FFF9E6', '#FFF4CC'] : ['#F3F4F6', '#E5E7EB']
                  }
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-2xl border"
                  style={{ borderColor: update.type === 'offer' ? '#FFE5B4' : '#D1D5DB' }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: COLORS.secondary }}
                    >
                      <Icon name="pricetag" size={18} color="#FFF" />
                    </View>
                    <View>
                      <Text className="text-base font-bold" style={{ color: COLORS.secondary }}>
                        {update.discountType === 'percentage'
                          ? `${update.discountValue}% OFF`
                          : `£${update.discountValue} OFF`}
                      </Text>
                      <Text className="text-[11px] text-gray-400 mt-0.5">Special Discount</Text>
                    </View>
                  </View>
                  {update.validUntil && (
                    <View className="items-end">
                      <Text className="text-[11px] text-gray-600 font-semibold">Valid till</Text>
                      <Text className="text-[13px] text-gray-900 font-bold mt-0.5">
                        {new Date(update.validUntil).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
};

export default UpdatesTab;
