import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { loginWithPhone, clearError } from '../../store/slices/authSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function LoginWithPhoneScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error);
      dispatch(clearError());
    }
  }, [error]);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setSendingOTP(true);
      const response = await ApiService.sendOTP({ phone });
      Alert.alert('Success', `OTP sent to ${phone}\n\n${response.otp ? `OTP: ${response.otp}` : ''}`);
      setStep(2);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await dispatch(loginWithPhone({ phone, otp })).unwrap();
    } catch (err) {
      // Error handled by useEffect
    }
  };

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24 }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="mb-8"
        >
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <View className="mb-10">
          <Text className="text-white text-3xl font-bold mb-2">Sign In with Phone</Text>
          <Text className="text-white text-base opacity-90">
            {step === 1 ? 'Enter your phone number' : 'Enter the OTP sent to your phone'}
          </Text>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-2xl">
          {step === 1 ? (
            <>
              <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2">Phone Number</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                  <Icon name="call-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSendOTP}
                disabled={sendingOTP}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  className="rounded-xl py-4 items-center shadow-lg"
                >
                  {sendingOTP ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Send OTP</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2">Enter OTP</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                  <Icon name="keypad-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-center text-2xl tracking-widest"
                    placeholder="000000"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleVerifyOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.secondaryDark]}
                  className="rounded-xl py-4 items-center shadow-lg mb-4"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Verify & Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setStep(1)}
                className="items-center"
              >
                <Text className="font-semibold" style={{ color: COLORS.secondary }}>Change Phone Number</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            className="items-center mt-6"
          >
            <Text className="text-gray-600">Sign in with email instead</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

