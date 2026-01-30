import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { loginAsGuest } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';

export default function RoleSelectionScreen({ navigation }) {
  const dispatch = useDispatch();
  const handleRoleSelect = (role) => {
    navigation.navigate('Login', { role });
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      className="flex-1"
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View className="flex-1 justify-center items-center px-6">
        {/* Logo */}
        <View className="items-center mb-12">
          <View style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: '#FFF',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8
          }}>
            <Image
              source={require('../../../assets/HashViewlogo-01.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-2">
            Welcome to HashView
          </Text>
          <Text className="text-base text-white/80 text-center">
            Choose your account type to continue
          </Text>
        </View>

        {/* Role Cards */}
        <View className="w-full space-y-4">
          {/* Customer Card */}
          <TouchableOpacity
            onPress={() => handleRoleSelect('customer')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="rounded-3xl p-6"
              style={{ elevation: 8 }}
            >
              <View className="flex-row items-center">
                <View className="bg-white/20 rounded-full p-4 mr-4">
                  <Icon name="person" size={32} color="white" />

                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white mb-1">
                    Customer
                  </Text>
                  <Text className="text-white/90 text-sm">
                    Discover and review local businesses
                  </Text>
                </View>
                <Icon name="chevron-forward" size={28} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Business Owner Card */}
          <TouchableOpacity
            onPress={() => handleRoleSelect('business')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="rounded-3xl p-6"
              style={{ elevation: 8 }}
            >
              <View className="flex-row items-center">
                <View className="bg-white/20 rounded-full p-4 mr-4">
                  <Icon name="business" size={32} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white mb-1">
                    Business Owner
                  </Text>
                  <Text className="text-white/90 text-sm">
                    Manage your business and customers
                  </Text>
                </View>
                <Icon name="chevron-forward" size={28} color="white" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Guest Access - Available on Both iOS and Android */}
        <TouchableOpacity
          onPress={() => dispatch(loginAsGuest())}
          activeOpacity={0.8}
          className="mt-6 w-full"
        >
          <View
            className="flex-row items-center justify-between p-4 rounded-3xl border border-white/20 bg-white/10"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center">
              <View className="bg-white/20 rounded-full p-2.5 mr-3">
                <Icon name="planet-outline" size={20} color="white" />
              </View>
              <View>
                <Text className="text-lg font-bold text-white">
                  Continue as Guest
                </Text>
                <Text className="text-white/70 text-xs">
                  Explore without an account
                </Text>
              </View>
            </View>
            <Icon name="arrow-forward-circle-outline" size={24} color="white" style={{ opacity: 0.8 }} />
          </View>
        </TouchableOpacity>

        {/* Admin Login Hint */}
        <View className="mt-8">
          <Text className="text-white/60 text-sm text-center">
            Admin? Login as Customer with admin credentials
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
