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
import { useDispatch } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function ResetPasswordScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { email } = route.params;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Call reset password API with OTP verification
      await ApiService.resetPasswordWithOTP({ 
        email: email.toLowerCase().trim(), 
        password: newPassword 
      });
      
      setLoading(false);
      
      Alert.alert(
        'Success!',
        'Your password has been reset successfully. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
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
                <Icon name="key" size={40} color="white" />
              </LinearGradient>
              <Text className="text-3xl font-bold text-gray-900 text-center">
                Reset Password
              </Text>
              <Text className="text-gray-600 text-center mt-2">
                Create a new password for your account
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">New Password</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <Icon name="lock-closed-outline" size={22} color={COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Enter new password"
                  placeholderTextColor={COLORS.gray400}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Icon
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color={COLORS.gray500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Confirm Password</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                <Icon name="lock-closed-outline" size={22} color={COLORS.gray500} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Confirm new password"
                  placeholderTextColor={COLORS.gray400}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color={COLORS.gray500}
                  />
                </TouchableOpacity>
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
                    Reset Password
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
