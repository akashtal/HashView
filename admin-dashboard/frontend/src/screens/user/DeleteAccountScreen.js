import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useDispatch, useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import { logout } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';

export default function DeleteAccountScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReasons, setSelectedReasons] = useState([]);

  const deleteReasons = [
    'I have privacy concerns',
    'I found a better alternative',
    'I don\'t find it useful',
    'Too many notifications',
    'Difficult to use',
    'Technical issues',
    'Other'
  ];

  const toggleReason = (reasonText) => {
    if (selectedReasons.includes(reasonText)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reasonText));
    } else {
      setSelectedReasons([...selectedReasons, reasonText]);
    }
  };

  const handleDeleteAccount = () => {
    if (!password.trim()) {
      showMessage({
        message: 'Password Required',
        description: 'Please enter your password to confirm account deletion',
        type: 'warning',
      });
      return;
    }

    Alert.alert(
      '⚠️ Delete Account',
      'This action CANNOT be undone. All your data including reviews, coupons, and personal information will be permanently deleted.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: confirmDeleteAccount
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);

      await ApiService.deleteAccount({
        password,
        reasons: selectedReasons,
        feedback: reason
      });

      showMessage({
        message: 'Account Deleted',
        description: 'Your account has been permanently deleted',
        type: 'info',
        duration: 3000,
      });

      setLoading(false);

      // Logout and redirect to auth
      setTimeout(() => {
        dispatch(logout());
      }, 2000);

    } catch (error) {
      setLoading(false);
      console.error('Delete account error:', error);
      showMessage({
        message: 'Deletion Failed',
        description: error.message || 'Failed to delete account. Please verify your password.',
        type: 'danger',
      });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      
      {/* Header */}
      <LinearGradient
        colors={['#DC2626', '#B91C1C']}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">Delete Account</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="px-6 py-4">
          {/* Warning Banner */}
          <View className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
            <View className="flex-row items-start mb-3">
              <Icon name="warning" size={28} color="#DC2626" />
              <View className="flex-1 ml-3">
                <Text className="text-red-900 font-bold text-lg mb-2">
                  Permanent Action
                </Text>
                <Text className="text-red-700 leading-relaxed">
                  Once you delete your account, there is no going back. Please be certain.
                </Text>
              </View>
            </View>
          </View>

          {/* What will be deleted */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              What will be deleted:
            </Text>

            <View className="space-y-3">
              {[
                { icon: 'person-outline', text: 'Your profile and account information', color: '#EF4444' },
                { icon: 'chatbubbles-outline', text: 'All your reviews and ratings', color: '#F59E0B' },
                { icon: 'gift-outline', text: 'All active and expired coupons', color: '#10B981' },
                { icon: 'notifications-outline', text: 'Notification preferences and history', color: '#3B82F6' },
                { icon: 'images-outline', text: 'Uploaded photos and documents', color: '#8B5CF6' }
              ].map((item, index) => (
                <View key={index} className="flex-row items-center mb-3">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <Icon name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text className="text-sm text-gray-700 ml-3 flex-1">
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reason for leaving */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Why are you leaving? (Optional)
            </Text>
            <Text className="text-sm text-gray-600 mb-4">
              Help us improve by sharing your feedback
            </Text>

            {deleteReasons.map((reasonText, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => toggleReason(reasonText)}
                className="flex-row items-center py-3 border-b border-gray-100"
              >
                <Icon
                  name={selectedReasons.includes(reasonText) ? "checkbox" : "square-outline"}
                  size={22}
                  color={selectedReasons.includes(reasonText) ? COLORS.primary : '#D1D5DB'}
                />
                <Text className="ml-3 text-base text-gray-900 flex-1">
                  {reasonText}
                </Text>
              </TouchableOpacity>
            ))}

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Additional Comments
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="Tell us more about your experience..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Confirmation */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Confirm Your Password
            </Text>

            <Text className="text-sm text-gray-600 mb-3">
              For security, please enter your password to confirm deletion
            </Text>

            <View className="flex-row items-center border-2 border-red-300 rounded-xl px-4 py-3 bg-red-50">
              <Icon name="lock-closed-outline" size={20} color="#DC2626" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="ml-2"
              >
                <Icon
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#DC2626"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Info */}
          <View className="bg-gray-100 rounded-2xl p-6 mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Account to be deleted:
            </Text>
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FFF9F0' }}
              >
                <Text className="text-xl font-bold" style={{ color: COLORS.secondary }}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {user?.name}
                </Text>
                <Text className="text-sm text-gray-600">{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Alternatives */}
          <View className="bg-blue-50 rounded-2xl p-5 mb-4">
            <View className="flex-row items-start">
              <Icon name="information-circle" size={24} color="#3B82F6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-900 font-semibold mb-2">
                  Not sure about deleting?
                </Text>
                <Text className="text-blue-700 text-sm mb-3">
                  You can temporarily deactivate your account instead. This keeps your data safe while you take a break.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AccountSettings')}
                  className="self-start px-4 py-2 bg-blue-600 rounded-full"
                >
                  <Text className="text-white font-semibold text-sm">
                    Deactivate Instead
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={loading || !password.trim()}
            className="rounded-xl py-4 items-center mb-4"
            style={{
              backgroundColor: loading || !password.trim() ? '#FCA5A5' : '#DC2626'
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View className="flex-row items-center">
                <Icon name="trash-outline" size={20} color="#FFF" />
                <Text className="text-white font-bold text-base ml-2">
                  Delete My Account Forever
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={loading}
            className="py-3 items-center mb-6"
          >
            <Text className="text-gray-600 font-medium">
              Cancel, Keep My Account
            </Text>
          </TouchableOpacity>

          {/* Support Contact */}
          <View className="bg-white rounded-2xl p-5 mb-6">
            <Text className="text-sm text-gray-600 text-center mb-2">
              Having issues? Contact our support team before deleting
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('HelpSupport')}
              className="flex-row items-center justify-center"
            >
              <Icon name="help-circle-outline" size={18} color={COLORS.primary} />
              <Text className="ml-2 font-semibold" style={{ color: COLORS.primary }}>
                Get Help Instead
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
