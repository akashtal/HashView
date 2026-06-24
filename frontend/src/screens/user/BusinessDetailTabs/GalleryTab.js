import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

const GalleryTab = ({ displayBusiness, handleImagePress }) => {
  return (
    <View>
      {displayBusiness.images && displayBusiness.images.length > 0 ? (
        <View className="flex-row flex-wrap -mx-1.5">
          {displayBusiness.images.map((img, index) => (
            <View key={index} className="w-1/2 px-1.5 mb-3">
              <TouchableOpacity
                activeOpacity={0.8}
                className="rounded-2xl overflow-hidden shadow-md"
                onPress={() => handleImagePress(img.url)}
              >
                <Image
                  source={{ uri: img.url }}
                  className="w-full h-44 bg-gray-100"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center py-14">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-5">
            <Icon name="images-outline" size={50} color="#D1D5DB" />
          </View>
          <Text className="text-gray-600 mt-2 text-base font-semibold">
            No gallery images
          </Text>
          <Text className="text-gray-400 mt-1.5 text-sm">Photos will appear here</Text>
        </View>
      )}
    </View>
  );
};

export default GalleryTab;
