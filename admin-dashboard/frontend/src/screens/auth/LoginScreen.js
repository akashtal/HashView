import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../config/colors';

export default function LoginScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const role = route.params?.role || 'customer';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const getFriendlyErrorMessage = (rawError) => {
    if (!rawError) {
      return 'Something went wrong. Please try again.';
    }

    const message = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);
    const normalized = message.toLowerCase();

    if (normalized.includes('no account found')) {
      return 'No account found with this email. Please check your email or sign up to create a new account.';
    }

    if (normalized.includes('suspended')) {
      return message;
    }

    if (normalized.includes('this email is registered as a')) {
      return message;
    }

    if (normalized.includes('invalid credentials')) {
      return 'Incorrect email or password. Please try again.';
    }

    return message;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    const loginData = {
      ...formData,
      role: role
    };

    try {
      const safeEmail = loginData.email ? loginData.email.trim().toLowerCase() : '';
      console.log('Login attempt', { email: safeEmail, role });

      const result = await dispatch(login(loginData)).unwrap();

      console.log('Login successful', { userId: result.user._id, role: result.user.role });

      if (result.user.role === 'admin') {
        Alert.alert('Welcome Admin!', 'Redirecting to admin dashboard...');
      }
    } catch (error) {
      const safeEmail = loginData.email ? loginData.email.trim().toLowerCase() : '';
      console.log('Login failed', { email: safeEmail, role, error: String(error) });

      const message = getFriendlyErrorMessage(error);
      Alert.alert('Login Failed', message);
    }
  };

  const roleConfig = {
    customer: {
      title: 'Customer Login',
      icon: 'person',
      gradientColors: [COLORS.secondary, COLORS.secondaryDark],
    },
    business: {
      title: 'Business Login',
      icon: 'business',
      gradientColors: [COLORS.secondary, COLORS.secondaryDark],
    },
  };

  const config = roleConfig[role] || roleConfig.customer;

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
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-12 ml-6 bg-white/10 rounded-full p-3 self-start"
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Logo */}
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

          {/* Login Form Card */}
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
            {/* Header */}
            <View className="items-center mb-8">
              <LinearGradient
                colors={config.gradientColors}
                className="rounded-full p-4 mb-4"
              >
                <Icon name={config.icon} size={32} color="white" />
              </LinearGradient>
              <Text className="text-3xl font-bold text-gray-900">
                {config.title}
              </Text>
              <Text className="text-gray-600 mt-2">
                Sign in to continue
              </Text>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Email</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border"
                style={{ borderColor: errors.email ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="mail-outline" size={22} color={errors.email ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.gray400}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Password</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border"
                style={{ borderColor: errors.password ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="lock-closed-outline" size={22} color={errors.password ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.gray400}
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color={COLORS.gray500}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1 ml-1">{errors.password}</Text>
              )}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              className="items-end mb-6"
            >
              <Text style={{ color: config.gradientColors[0] }} className="font-semibold">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.gradientColors}
                className="rounded-xl py-4 items-center"
                style={{ elevation: 4 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row justify-center items-center mt-8 mb-6">
              <Text className="text-gray-600">Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp', { role })}>
                <Text style={{ color: config.gradientColors[0] }} className="font-bold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
