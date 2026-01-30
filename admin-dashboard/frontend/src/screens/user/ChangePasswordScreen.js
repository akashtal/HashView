import React, { useState } from 'react';
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
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ChangePasswordScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      showMessage({
        message: 'Validation Error',
        description: 'Please fix the errors before continuing',
        type: 'warning',
      });
      return;
    }

    try {
      setLoading(true);

      await ApiService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      showMessage({
        message: 'Password Changed!',
        description: 'Your password has been updated successfully',
        type: 'success',
      });

      setLoading(false);
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Navigate back after short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);

    } catch (error) {
      setLoading(false);
      console.error('Change password error:', error);
      showMessage({
        message: 'Password Change Failed',
        description: error.message || 'Failed to change password',
        type: 'danger',
      });
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 'none', color: '#D1D5DB', text: '' };
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    if (strength <= 2) return { strength: 'weak', color: '#EF4444', text: 'Weak' };
    if (strength <= 4) return { strength: 'medium', color: '#F59E0B', text: 'Medium' };
    return { strength: 'strong', color: '#10B981', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

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
          <Text className="text-white text-2xl font-bold flex-1">Change Password</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Info Banner */}
        <View className="bg-blue-50 rounded-2xl p-4 mb-6 flex-row items-start">
          <Icon name="information-circle" size={24} color="#3B82F6" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-900 font-semibold mb-1">
              Password Security Tips
            </Text>
            <Text className="text-blue-700 text-sm leading-relaxed">
              Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols for a strong password.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl p-6 shadow-sm">
          {/* Current Password */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Current Password
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <Icon name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, currentPassword: text });
                  if (errors.currentPassword) setErrors({ ...errors, currentPassword: null });
                }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                className="ml-2"
              >
                <Icon
                  name={showCurrentPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword && (
              <Text className="text-red-500 text-xs mt-1 ml-2">
                {errors.currentPassword}
              </Text>
            )}
          </View>

          {/* New Password */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              New Password
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <Icon name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, newPassword: text });
                  if (errors.newPassword) setErrors({ ...errors, newPassword: null });
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                className="ml-2"
              >
                <Icon
                  name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Indicator */}
            {formData.newPassword.length > 0 && (
              <View className="mt-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-gray-600">Password Strength</Text>
                  <Text className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                    {passwordStrength.text}
                  </Text>
                </View>
                <View className="flex-row space-x-1">
                  {[1, 2, 3].map((level) => (
                    <View
                      key={level}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          passwordStrength.strength === 'weak' && level === 1
                            ? passwordStrength.color
                            : passwordStrength.strength === 'medium' && level <= 2
                            ? passwordStrength.color
                            : passwordStrength.strength === 'strong'
                            ? passwordStrength.color
                            : '#E5E7EB'
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {errors.newPassword && (
              <Text className="text-red-500 text-xs mt-1 ml-2">
                {errors.newPassword}
              </Text>
            )}
          </View>

          {/* Confirm Password */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <Icon name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, confirmPassword: text });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="ml-2"
              >
                <Icon
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text className="text-red-500 text-xs mt-1 ml-2">
                {errors.confirmPassword}
              </Text>
            )}
            
            {/* Match Indicator */}
            {formData.confirmPassword.length > 0 && (
              <View className="flex-row items-center mt-2">
                <Icon
                  name={
                    formData.newPassword === formData.confirmPassword
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={16}
                  color={
                    formData.newPassword === formData.confirmPassword
                      ? "#10B981"
                      : "#EF4444"
                  }
                />
                <Text
                  className="text-xs ml-1"
                  style={{
                    color:
                      formData.newPassword === formData.confirmPassword
                        ? "#10B981"
                        : "#EF4444"
                  }}
                >
                  {formData.newPassword === formData.confirmPassword
                    ? "Passwords match"
                    : "Passwords don't match"}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={loading}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: COLORS.primary }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white font-bold text-base">
                Change Password
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            className="mt-4 py-2"
          >
            <Text className="text-center text-sm" style={{ color: COLORS.primary }}>
              Forgot your current password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Tips */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mt-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Password Best Practices
          </Text>
          
          <View className="space-y-3">
            {[
              'Use a unique password for each account',
              'Avoid using personal information',
              'Change your password regularly',
              'Don\'t share your password with anyone',
              'Use a password manager for security'
            ].map((tip, index) => (
              <View key={index} className="flex-row items-start mb-2">
                <Icon name="checkmark-circle" size={20} color="#10B981" />
                <Text className="text-sm text-gray-600 ml-2 flex-1">
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
