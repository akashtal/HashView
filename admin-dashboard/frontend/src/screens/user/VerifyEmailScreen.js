import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useDispatch, useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import { updateUser } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';

export default function VerifyEmailScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    // Send OTP automatically when screen loads
    sendOTP();
  }, []);

  useEffect(() => {
    // Timer countdown
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const sendOTP = async () => {
    try {
      setSending(true);
      
      await ApiService.sendEmailOTP({ email: user.email });
      
      showMessage({
        message: 'OTP Sent!',
        description: `Verification code sent to ${user.email}`,
        type: 'success',
      });

      setTimer(60);
      setCanResend(false);
      setSending(false);
    } catch (error) {
      setSending(false);
      showMessage({
        message: 'Failed to send OTP',
        description: error.message,
        type: 'danger',
      });
    }
  };

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      showMessage({
        message: 'Invalid OTP',
        description: 'Please enter the 6-digit code',
        type: 'warning',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await ApiService.verifyEmailOTP({
        email: user.email,
        otp: otpCode
      });

      // Update user in Redux to mark email as verified
      dispatch(updateUser({ ...user, emailVerified: true }));

      showMessage({
        message: 'Email Verified!',
        description: 'Your email has been successfully verified',
        type: 'success',
      });

      setLoading(false);

      // Navigate back to EditProfile
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      setLoading(false);
      showMessage({
        message: 'Verification Failed',
        description: error.message || 'Invalid or expired OTP',
        type: 'danger',
      });
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (canResend) {
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      sendOTP();
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">Verify Email</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* Icon */}
          <View className="items-center mb-6">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: '#FFF9F0' }}
            >
              <Icon name="mail" size={40} color={COLORS.secondary} />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </Text>
            <Text className="text-center text-gray-600 px-4">
              We've sent a 6-digit verification code to
            </Text>
            <Text className="text-center font-semibold text-gray-900 mt-1">
              {user?.email}
            </Text>
          </View>

          {/* OTP Input */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-4 text-center">
              Enter Verification Code
            </Text>
            
            <View className="flex-row justify-between mb-6">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  className="w-12 h-14 rounded-xl text-center text-2xl font-bold border-2"
                  style={{
                    borderColor: digit ? COLORS.primary : '#E5E7EB',
                    color: COLORS.primary
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            {/* Timer */}
            <View className="items-center mb-4">
              {!canResend ? (
                <View className="flex-row items-center">
                  <Icon name="time-outline" size={18} color="#9CA3AF" />
                  <Text className="text-gray-600 ml-2">
                    Resend code in {timer}s
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={sending}
                  className="flex-row items-center"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Icon name="refresh" size={18} color={COLORS.primary} />
                      <Text className="ml-2 font-semibold" style={{ color: COLORS.primary }}>
                        Resend Code
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="rounded-xl py-4 items-center"
              style={{
                backgroundColor: loading || otp.join('').length !== 6 
                  ? '#D1D5DB' 
                  : COLORS.primary
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Verify Email
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View className="bg-blue-50 rounded-2xl p-5">
            <View className="flex-row items-start">
              <Icon name="information-circle" size={24} color="#3B82F6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-900 font-semibold mb-2">
                  Didn't receive the code?
                </Text>
                <Text className="text-blue-700 text-sm leading-relaxed">
                  • Check your spam/junk folder{'\n'}
                  • Make sure {user?.email} is correct{'\n'}
                  • Wait for the timer to resend
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
