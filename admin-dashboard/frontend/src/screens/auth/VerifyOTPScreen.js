import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image
} from 'react-native';
import { useDispatch } from 'react-redux';
import { register } from '../../store/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import { showErrorMessage, showSuccessMessage } from '../../utils/errorHandler';

export default function VerifyOTPScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { email, userData, isPasswordReset } = route.params;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (value, index) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleContinue = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      showErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      await ApiService.verifyEmailOTP({ email, otp: otpCode });

      if (isPasswordReset) {
        setLoading(false);
        navigation.navigate('ResetPassword', { email, otpCode });
      } else {
        try {
          const addressPayload = userData ? {
            buildingNumber: userData.buildingNumber || '',
            street: userData.street || '',
            city: userData.city || '',
            county: userData.county || '',
            postcode: userData.postcode || '',
            country: userData.country || 'United Kingdom',
            landmark: userData.landmark || '',
            fullAddress: userData.address || [
              userData.buildingNumber,
              userData.street,
              userData.city,
              userData.county,
              userData.postcode,
              userData.country || 'United Kingdom'
            ]
              .filter(Boolean)
              .join(', ')
          } : null;

          const registrationData = {
            name: userData.name,
            email: userData.email.toLowerCase().trim(),
            password: userData.password,
            phone: userData.phone,
            role: userData.role || 'customer',
            ...(addressPayload && {
              address: addressPayload,
              buildingNumber: addressPayload.buildingNumber,
              street: addressPayload.street,
              city: addressPayload.city,
              county: addressPayload.county,
              postcode: addressPayload.postcode,
              country: addressPayload.country,
              landmark: addressPayload.landmark
            })
          };

          console.log('Registering user with data:', { ...registrationData, password: '***' });

          const result = await dispatch(register(registrationData)).unwrap();
          setLoading(false);

          showSuccessMessage(
            'Success! 🎉',
            'Your account has been created successfully!'
          );
        } catch (error) {
          setLoading(false);
          console.error('Registration error:', error);

          showErrorMessage(error, { title: 'Registration Failed' });
        }
      }
    } catch (error) {
      setLoading(false);
      showErrorMessage(error, { title: 'Verification Failed' });
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setCountdown(60);

    try {
      await ApiService.sendEmailOTP({ email });
      showSuccessMessage('Code Resent', 'A new verification code has been sent to your email.');
    } catch (error) {
      showErrorMessage('Failed to resend code. Please try again.');
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      className="flex-1"
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
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
              colors={[COLORS.primary, COLORS.primaryDark]}
              className="rounded-full p-4 mb-4"
            >
              <Icon name="shield-checkmark" size={40} color="white" />
            </LinearGradient>
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Enter Verification Code
            </Text>
            <Text className="text-gray-600 text-center mt-2 px-4">
              We sent a 6-digit code to{'\n'}
              <Text className="font-semibold">{email}</Text>
            </Text>
          </View>

          {/* OTP Input Boxes */}
          <View className="flex-row justify-center mb-6" style={{ gap: 10 }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl"
                style={{
                  borderWidth: 2,
                  borderColor: digit ? COLORS.secondary : COLORS.gray300,
                  backgroundColor: digit ? `${COLORS.secondary}10` : COLORS.gray100,
                  color: COLORS.gray900,
                }}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend Code */}
          <View className="items-center mb-6">
            <Text className="text-gray-600 mb-2">Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendDisabled}
            >
              <Text
                style={{ color: resendDisabled ? COLORS.gray400 : COLORS.secondary }}
                className="font-bold text-base"
              >
                {resendDisabled ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verify Button */}
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
                  Verify & Continue
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
