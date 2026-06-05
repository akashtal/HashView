import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ToastService from '../../utils/ToastService';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import PhoneInput from 'react-native-phone-number-input';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../config/colors';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import AppleSignInButton from '../../components/auth/AppleSignInButton';

export default function SignUpScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const role = route.params?.role || 'customer';
  const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
  const INDIA_PIN_REGEX = /^\d{6}$/;
  const SUPPORTED_COUNTRIES = ['United Kingdom', 'India'];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: role,
    buildingNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    landmark: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const phoneInputRef = useRef(null);
  const [rawPhoneValue, setRawPhoneValue] = useState('');

  const roleConfig = {
    customer: {
      title: 'Create Account',
      subtitle: 'Join HashView as a Customer',
      icon: 'person',
      gradientColors: [COLORS.secondary, COLORS.secondaryDark],
    },
    business: {
      title: 'Business Registration',
      subtitle: 'Register Your Business',
      icon: 'business',
      gradientColors: [COLORS.secondary, COLORS.secondaryDark],
    },
  };

  const config = roleConfig[role] || roleConfig.customer;

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must not exceed 50 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation - OPTIONAL for sign-up, only validate if user actually typed digits
    // NOTE: formData.phone always contains the country code prefix (+91, +44 etc.) even when empty,
    //       so we check rawPhoneValue (just the digits the user typed) instead.
    if (rawPhoneValue.trim()) {
      const isValidPhone = phoneInputRef.current?.isValidNumber(rawPhoneValue);
      if (!isValidPhone) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    // Address validation - OPTIONAL section. Only validate if the user has filled at least one field.
    // Building number is intentionally NOT required — many valid addresses omit it.
    const hasAnyAddressField = formData.buildingNumber.trim() ||
      formData.street.trim() ||
      formData.city.trim() ||
      formData.postcode.trim();

    if (hasAnyAddressField) {
      // Street, city and postcode/PIN are required if any address field is touched
      if (!formData.street.trim()) {
        newErrors.street = 'Street name is required';
      }

      if (!formData.city.trim()) {
        newErrors.city = 'Town/City is required';
      }

      const isIndia = formData.country === 'India';
      if (!formData.postcode.trim()) {
        newErrors.postcode = isIndia ? 'PIN code is required' : 'Postcode is required';
      } else if (isIndia && !INDIA_PIN_REGEX.test(formData.postcode.trim())) {
        newErrors.postcode = 'Please enter a valid 6-digit Indian PIN code';
      } else if (!isIndia && !UK_POSTCODE_REGEX.test(formData.postcode.trim())) {
        newErrors.postcode = 'Please enter a valid UK postcode (e.g. SW1A 1AA)';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms agreement
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms & Conditions to create an account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    const formattedAddress = [
      formData.buildingNumber?.trim(),
      formData.street?.trim(),
      formData.city?.trim(),
      formData.county?.trim(),
      formData.postcode?.trim().toUpperCase(),
      formData.country
    ]
      .filter(Boolean)
      .join(', ');

    // Navigate to email confirmation screen
    // Only include phone and address if they were provided
    navigation.navigate('ConfirmEmail', {
      userData: {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || '', // Optional - empty string if not provided
        password: formData.password,
        role: role,
        // Address fields - only include if address was provided
        ...(formattedAddress && {
          buildingNumber: formData.buildingNumber.trim() || '',
          street: formData.street.trim() || '',
          city: formData.city.trim() || '',
          county: formData.county.trim() || '',
          postcode: formData.postcode.trim().toUpperCase() || '',
          country: formData.country || 'United Kingdom',
          landmark: formData.landmark.trim() || '',
          address: formattedAddress
        })
      }
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
          <View className="items-center mt-4 mb-4">
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
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
                style={{ width: 100, height: 100 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Sign Up Form Card */}
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-6">
            {/* Header */}
            <View className="items-center mb-5">
              <LinearGradient
                colors={config.gradientColors}
                className="rounded-full p-3 mb-3"
              >
                <Icon name={config.icon} size={28} color="white" />
              </LinearGradient>
              <Text className="text-2xl font-bold text-gray-900">
                {config.title}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                {config.subtitle}
              </Text>
            </View>

            {/* OAuth Sign-In Options */}
            <View className="mb-5">
              <GoogleSignInButton role={role} style={{ marginBottom: 12 }} />
              <AppleSignInButton role={role} />

              <View className="flex-row items-center my-4">
                <View className="flex-1 h-[1px] bg-gray-300" />
                <Text className="mx-3 text-gray-500 font-medium text-sm">OR REGISTER WITH EMAIL</Text>
                <View className="flex-1 h-[1px] bg-gray-300" />
              </View>
            </View>

            {/* Name Input */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Full Name</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                style={{ borderColor: errors.name ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="person-outline" size={20} color={errors.name ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.gray400}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    if (errors.name) setErrors({ ...errors, name: null });
                  }}
                  autoCapitalize="words"
                />
              </View>
              {errors.name && (
                <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>
              )}
            </View>

            {/* Email Input */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Email Address</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                style={{ borderColor: errors.email ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="mail-outline" size={20} color={errors.email ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
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
                <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
              )}
            </View>

            {/* Phone Number Input - shown for all platforms (OPTIONAL) */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Phone Number (Optional)</Text>
              <PhoneInput
                ref={phoneInputRef}
                defaultCode="GB"
                layout="first"
                withShadow={false}
                defaultValue={rawPhoneValue}
                value={rawPhoneValue}
                onChangeText={(text) => {
                  setRawPhoneValue(text);
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                onChangeFormattedText={(text) => {
                  setFormData({ ...formData, phone: text });
                }}
                textInputProps={{
                  placeholder: 'Enter phone number',
                  placeholderTextColor: COLORS.gray400,
                }}
                containerStyle={{
                  width: '100%',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: errors.phone ? COLORS.error : COLORS.gray200,
                  backgroundColor: '#F9FAFB',
                }}
                textContainerStyle={{
                  backgroundColor: '#F9FAFB',
                  borderTopRightRadius: 12,
                  borderBottomRightRadius: 12,
                }}
                codeTextStyle={{ color: COLORS.gray900 }}
                textInputStyle={{ color: COLORS.gray900, fontSize: 16 }}
              />
              {errors.phone && (
                <Text className="text-red-500 text-xs mt-1">{errors.phone}</Text>
              )}
            </View>

            {/* Address Fields - UK or India */}
            <View className="mb-3">
              <Text className="text-gray-900 font-semibold mb-2 text-sm">Address</Text>

              {/* Country Selector */}
              <View className="flex-row mb-3">
                {SUPPORTED_COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setFormData({ ...formData, country: c, postcode: '' })}
                    style={{
                      flex: 1,
                      marginRight: c === 'United Kingdom' ? 6 : 0,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: formData.country === c ? COLORS.secondary : COLORS.gray200,
                      backgroundColor: formData.country === c ? COLORS.secondary + '15' : '#F9FAFB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: formData.country === c ? COLORS.secondary : COLORS.gray500 }}>
                      {c === 'United Kingdom' ? '🇬🇧 United Kingdom' : '🇮🇳 India'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Building Number & Street */}
              <View className="flex-row">
                <View className="w-24 mr-2">
                  <Text className="text-gray-700 font-medium mb-1 text-xs">Building No.</Text>
                  <View
                    className="bg-gray-50 rounded-xl px-3 py-2 border"
                    style={{ borderColor: errors.buildingNumber ? COLORS.error : COLORS.gray200 }}
                  >
                    <TextInput
                      className="text-center text-gray-900 text-sm"
                      placeholder="123"
                      placeholderTextColor={COLORS.gray400}
                      value={formData.buildingNumber}
                      onChangeText={(text) => {
                        setFormData({ ...formData, buildingNumber: text });
                        if (errors.buildingNumber) setErrors({ ...errors, buildingNumber: null });
                      }}
                    />
                  </View>
                  {errors.buildingNumber && (
                    <Text className="text-red-500 text-xs mt-1">{errors.buildingNumber}</Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-gray-700 font-medium mb-1 text-xs">Street Name</Text>
                  <View
                    className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                    style={{ borderColor: errors.street ? COLORS.error : COLORS.gray200 }}
                  >
                    <Icon name="business" size={18} color={errors.street ? COLORS.error : COLORS.gray500} />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 text-sm"
                      placeholder="e.g., Baker Street"
                      placeholderTextColor={COLORS.gray400}
                      value={formData.street}
                      onChangeText={(text) => {
                        setFormData({ ...formData, street: text });
                        if (errors.street) setErrors({ ...errors, street: null });
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.street && (
                    <Text className="text-red-500 text-xs mt-1">{errors.street}</Text>
                  )}
                </View>
              </View>

              {/* City */}
              <View className="mt-3">
                <Text className="text-gray-700 font-medium mb-1 text-xs">Town/City</Text>
                <View
                  className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                  style={{ borderColor: errors.city ? COLORS.error : COLORS.gray200 }}
                >
                  <Icon name="home" size={18} color={errors.city ? COLORS.error : COLORS.gray500} />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-sm"
                    placeholder="e.g., London"
                    placeholderTextColor={COLORS.gray400}
                    value={formData.city}
                    onChangeText={(text) => {
                      setFormData({ ...formData, city: text });
                      if (errors.city) setErrors({ ...errors, city: null });
                    }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.city && (
                  <Text className="text-red-500 text-xs mt-1">{errors.city}</Text>
                )}
              </View>

              {/* County & Postcode */}
              <View className="flex-row mt-3">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-700 font-medium mb-1 text-xs">County (Optional)</Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <Icon name="flag" size={18} color={COLORS.gray500} />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 text-sm"
                      placeholder="e.g., Greater London"
                      placeholderTextColor={COLORS.gray400}
                      value={formData.county}
                      onChangeText={(text) => {
                        setFormData({ ...formData, county: text });
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View className="flex-1 ml-2">
                  <Text className="text-gray-700 font-medium mb-1 text-xs">
                    {formData.country === 'India' ? 'PIN Code' : 'Postcode'}
                  </Text>
                  <View
                    className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                    style={{ borderColor: errors.postcode ? COLORS.error : COLORS.gray200 }}
                  >
                    <Icon name="mail" size={18} color={errors.postcode ? COLORS.error : COLORS.gray500} />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 text-sm"
                      placeholder={formData.country === 'India' ? '400001' : 'SW1A 1AA'}
                      placeholderTextColor={COLORS.gray400}
                      value={formData.postcode}
                      onChangeText={(text) => {
                        const formatted = formData.country === 'India' ? text.replace(/\D/g, '') : text.toUpperCase();
                        setFormData({ ...formData, postcode: formatted });
                        if (errors.postcode) setErrors({ ...errors, postcode: null });
                      }}
                      autoCapitalize={formData.country === 'India' ? 'none' : 'characters'}
                      keyboardType={formData.country === 'India' ? 'numeric' : 'default'}
                      maxLength={formData.country === 'India' ? 6 : 8}
                    />
                  </View>
                  {errors.postcode && (
                    <Text className="text-red-500 text-xs mt-1">{errors.postcode}</Text>
                  )}
                </View>
              </View>

              {/* Country — read-only display after selector above */}
              <View className="mt-3">
                <Text className="text-gray-700 font-medium mb-1 text-xs">Country</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                  <Icon name="globe" size={18} color={COLORS.gray500} />
                  <Text className="flex-1 ml-3 text-gray-900 font-semibold text-sm">
                    {formData.country === 'India' ? '🇮🇳' : '🇬🇧'} {formData.country}
                  </Text>
                </View>
              </View>

              {/* Landmark */}
              <View className="mt-3">
                <Text className="text-gray-700 font-medium mb-1 text-xs">Landmark (Optional)</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Icon name="navigate" size={18} color={COLORS.gray500} />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900 text-sm"
                    placeholder="e.g., Near Tesco"
                    placeholderTextColor={COLORS.gray400}
                    value={formData.landmark}
                    onChangeText={(text) => {
                      setFormData({ ...formData, landmark: text });
                    }}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Password</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                style={{ borderColor: errors.password ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="lock-closed-outline" size={20} color={errors.password ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Create a password"
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
                    size={20}
                    color={COLORS.gray500}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Confirm Password</Text>
              <View
                className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border"
                style={{ borderColor: errors.confirmPassword ? COLORS.error : COLORS.gray200 }}
              >
                <Icon name="lock-closed-outline" size={20} color={errors.confirmPassword ? COLORS.error : COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Confirm your password"
                  placeholderTextColor={COLORS.gray400}
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, confirmPassword: text });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                  }}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.gray500}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500 text-xs mt-1">{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Terms & Conditions Checkbox */}
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  if (errors.terms) setErrors({ ...errors, terms: null });
                }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: errors.terms ? '#EF4444' : (agreedToTerms ? COLORS.secondary : COLORS.gray300),
                  backgroundColor: agreedToTerms ? COLORS.secondary : '#fff',
                  alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
                }}>
                  {agreedToTerms && <Icon name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>
                    I agree to the{' '}
                    <Text
                      onPress={() => navigation.navigate('TermsAndConditions')}
                      style={{ color: COLORS.secondary, fontWeight: '700', textDecorationLine: 'underline' }}
                    >
                      Terms & Conditions
                    </Text>
                    {' '}of HashView
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.terms && (
                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 32 }}>
                  {errors.terms}
                </Text>
              )}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
              className="mb-4"
            >
              <LinearGradient
                colors={config.gradientColors}
                className="rounded-xl py-4 items-center"
                style={{ elevation: 4 }}
              >
                <Text className="text-white font-bold text-base">
                  Create Account
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center items-center mb-6">
              <Text className="text-gray-600 text-sm">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
                <Text style={{ color: config.gradientColors[0] }} className="font-bold text-sm">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
