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
  Platform
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { showErrorMessage, showSuccessMessage } from '../../utils/errorHandler';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ConfirmEmailScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.userData?.email || '');
  const [loading, setLoading] = useState(false);
  const userData = route.params?.userData;
  const isPasswordReset = route.params?.isPasswordReset || false;

  const handleContinue = async () => {
    if (!email) {
      showErrorMessage('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await ApiService.sendEmailOTP({ email });
      setLoading(false);

      navigation.navigate('VerifyOTP', {
        email,
        userData,
        isPasswordReset
      });

      showSuccessMessage(
        'Verification Code Sent',
        `We've sent a 6-digit code to ${email}. Please check your email (including spam folder).`
      );
    } catch (error) {
      setLoading(false);
      showErrorMessage(error, { title: 'Failed to Send Code' });
    }
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
              width: 140,
              height: 140,
              borderRadius: 70,
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
                style={{ width: 120, height: 120 }}
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
                <Icon name="mail" size={40} color="white" />
              </LinearGradient>
              <Text className="text-3xl font-bold text-gray-900 text-center">
                Verify Your Email
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                We'll send a verification code to your email
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
                  editable={!userData?.email}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
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
                    Send Verification Code
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
