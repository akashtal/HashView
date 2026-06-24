import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import COLORS from '../../../config/colors';

const AboutTab = ({ displayBusiness }) => {
  return (
    <View>
      {displayBusiness.description && (
        <View className="mb-5">
          <Text className="text-base font-bold text-gray-900 mb-3">About</Text>
          <Text className="text-sm text-gray-700 leading-5">
            {displayBusiness.description}
          </Text>
        </View>
      )}

      {/* Contact Info */}
      {displayBusiness.phone && (
        <View className="mb-3 flex-row items-center">
          <Icon name="call" size={20} color={COLORS.primary} />
          <Text className="text-sm text-gray-700 ml-3">{displayBusiness.phone}</Text>
        </View>
      )}

      {displayBusiness.email && (
        <View className="mb-3 flex-row items-center">
          <Icon name="mail" size={20} color={COLORS.primary} />
          <Text className="text-sm text-gray-700 ml-3">{displayBusiness.email}</Text>
        </View>
      )}
    </View>
  );
};

export default AboutTab;
