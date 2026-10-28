import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../config/colors';
import Onboarding1Svg from '../../../assets/onboarding_1.svg';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: 1,
    title: 'Discover & Review',
    description: 'Find the best local businesses, restaurants, and services in your area. Share your authentic experience by writing verified reviews.',
    icon: 'search',
    color: '#3B82F6', // Blue
    svg: Onboarding1Svg,
  },
  {
    id: 2,
    title: 'Earn Scratch Cards (£)',
    description: 'Get rewarded for your feedback! Every time you write a verified review, you earn a Scratch Card with real cash rewards (£) or exclusive discounts.',
    icon: 'ticket',
    color: '#F59E0B', // Amber
  },
  {
    id: 3,
    title: 'Order Food Seamlessly',
    description: 'Skip the queues! Browse menus and order food directly through the app for dine-in or quick pickup from your favorite spots.',
    icon: 'fast-food',
    color: '#10B981', // Green
  },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (step < ONBOARDING_DATA.length - 1) {
      setStep(step + 1);
    } else {
      // Finish onboarding
      try {
        await AsyncStorage.setItem('@has_seen_onboarding', 'true');
      } catch (e) {
        console.error('Error saving onboarding state:', e);
      }
      navigation.replace('RoleSelection');
    }
  };

  const currentData = ONBOARDING_DATA[step];

  return (
    <View className="flex-1 bg-[#140033]">
      {/* Background / Image Area */}
      {currentData.svg ? (
        <View className="absolute inset-0 w-full h-full bg-[#140033]">
          <currentData.svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
        </View>
      ) : (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          className="flex-1 items-center justify-center px-6"
        >
          <View 
            className="w-32 h-32 rounded-full items-center justify-center shadow-2xl mb-8 border-4 border-white/20"
            style={{ backgroundColor: currentData.color }}
          >
            <Icon name={currentData.icon} size={64} color="#FFF" />
            
            {currentData.id === 2 && (
              <View className="absolute -bottom-2 -right-2 bg-green-500 w-12 h-12 rounded-full items-center justify-center border-2 border-white shadow-lg">
                <Text className="text-white font-bold text-xl">£</Text>
              </View>
            )}
          </View>

          <Text className="text-3xl font-black text-white text-center mb-4 tracking-wide">
            {currentData.title}
          </Text>
          
          <Text className="text-base text-white/80 text-center leading-relaxed px-4">
            {currentData.description}
          </Text>
        </LinearGradient>
      )}

      {/* Bottom Action Area */}
      <View 
        className={`absolute bottom-0 w-full px-8 pb-12 pt-10 items-center ${
          currentData.svg ? '' : 'bg-white rounded-t-[40px]'
        }`}
      >
        {/* Pagination Dots */}
        <View className="flex-row items-center justify-center space-x-3 mb-6">
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              className={`h-2.5 rounded-full mx-1 ${
                index === step 
                  ? (currentData.svg ? 'w-8 bg-white' : 'w-8 bg-[#210059]') 
                  : (currentData.svg ? 'w-2.5 bg-white/40' : 'w-2.5 bg-gray-300')
              }`}
            />
          ))}
        </View>

        {/* Buttons */}
        <View className="w-full">
          <TouchableOpacity 
            onPress={handleNext}
            activeOpacity={0.8}
            className="w-full shadow-lg"
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="py-4 rounded-2xl items-center justify-center w-full flex-row"
            >
              <Text className="text-white font-bold text-[18px]">
                {step === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Icon 
                name="arrow-forward" 
                size={20} 
                color="#FFF" 
                style={{ marginLeft: 8 }} 
              />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Skip Button */}
          {step < ONBOARDING_DATA.length - 1 && (
            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('@has_seen_onboarding', 'true');
                navigation.replace('RoleSelection');
              }}
              className="mt-6 items-center"
            >
              <Text className="font-semibold text-[15px] text-gray-700">
                Skip for now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
