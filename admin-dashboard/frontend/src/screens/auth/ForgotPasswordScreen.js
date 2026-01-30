import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../config/colors';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Navigate to confirm email screen for password reset
    navigation.navigate('ConfirmEmail', {
      userData: { email },
      isPasswordReset: true
    });
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      className="flex-1"
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-12 ml-6 bg-white/10 rounded-full p-3 self-start"
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="items-center mt-8 mb-6">
            <View style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#FFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 6
            }}>
              <Image
                source={require('../../../assets/HashViewlogo-01.png')}
                style={{ width: 140, height: 140 }}
                resizeMode="contain"
              />
            </View>
          </View>

          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
            <View className="items-center mb-8">
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                className="rounded-full p-4 mb-4"
              >
                <Icon name="lock-closed" size={40} color="white" />
              </LinearGradient>
              <Text className="text-3xl font-bold text-gray-900 text-center">
                Forgot Password?
              </Text>
              <Text className="text-gray-600 text-center mt-2 px-4">
                Enter your email and we'll send you a verification code to reset your password
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Email Address</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <Icon name="mail-outline" size={22} color={COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.gray400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                className="rounded-xl py-4 items-center"
                style={{ elevation: 4 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Send Reset Code
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="items-center mt-6">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={{ color: COLORS.primary }} className="font-semibold">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
