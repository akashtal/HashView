import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function AccountSettingsScreen({ navigation }) {
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailVerified: user?.emailVerified || false,
    twoFactorAuth: false,
    loginAlerts: true,
    dataSharing: false,
    marketingEmails: true,
  });

  const sendVerificationEmail = async () => {
    try {
      setLoading(true);
      await ApiService.sendEmailOTP({ email: user.email });
      
      showMessage({
        message: 'Verification Email Sent!',
        description: 'Please check your inbox and follow the instructions',
        type: 'success',
      });
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showMessage({
        message: 'Failed to send email',
        description: error.message,
        type: 'danger',
      });
    }
  };


  const toggleSetting = async (key) => {
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });

    try {
      // Save to backend
      await ApiService.updateAccountSettings({ [key]: newValue });
      
      showMessage({
        message: 'Setting Updated',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      // Revert on error
      setSettings({ ...settings, [key]: !newValue });
      showMessage({
        message: 'Failed to update setting',
        type: 'danger',
      });
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Personal Data',
      'We will send a copy of all your personal data to your registered email address. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              setLoading(true);
              await ApiService.exportUserData();
              
              showMessage({
                message: 'Data Export Requested',
                description: 'You will receive an email with your data shortly',
                type: 'success',
              });
              
              setLoading(false);
            } catch (error) {
              setLoading(false);
              showMessage({
                message: 'Export Failed',
                description: error.message,
                type: 'danger',
              });
            }
          }
        }
      ]
    );
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be temporarily disabled. You can reactivate it by logging in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ApiService.deactivateAccount();
              
              showMessage({
                message: 'Account Deactivated',
                description: 'Your account has been temporarily deactivated',
                type: 'info',
              });
              
              setLoading(false);
              
              // Logout after deactivation
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }, 2000);
            } catch (error) {
              setLoading(false);
              showMessage({
                message: 'Deactivation Failed',
                description: error.message,
                type: 'danger',
              });
            }
          }
        }
      ]
    );
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
          <Text className="text-white text-2xl font-bold flex-1">Account Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="px-6 py-4">
          {/* Account Verification */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Account Verification
            </Text>

            {/* Email Verification */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Icon
                    name="mail-outline"
                    size={20}
                    color={user?.emailVerified ? "#10B981" : "#9CA3AF"}
                  />
                  <Text className="text-base font-medium text-gray-900 ml-2">
                    Email Address
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 ml-7">{user?.email}</Text>
              </View>
              
              {user?.emailVerified ? (
                <View className="flex-row items-center">
                  <Icon name="checkmark-circle" size={20} color="#10B981" />
                  <Text className="text-green-600 font-medium ml-1">Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={sendVerificationEmail}
                  disabled={loading}
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: '#FFF9F0' }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                  ) : (
                    <Text className="font-semibold" style={{ color: COLORS.secondary }}>
                      Verify
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

          </View>

          {/* Security Settings */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Security
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">
                  Two-Factor Authentication
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Add an extra layer of security (Coming Soon)
                </Text>
              </View>
              <Switch
                value={settings.twoFactorAuth}
                onValueChange={() => toggleSetting('twoFactorAuth')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
                disabled
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">
                  Login Alerts
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Get notified of new login attempts
                </Text>
              </View>
              <Switch
                value={settings.loginAlerts}
                onValueChange={() => toggleSetting('loginAlerts')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="border-t border-gray-100 my-4" />

            <TouchableOpacity
              onPress={() => navigation.navigate('ChangePassword')}
              className="flex-row items-center py-2"
            >
              <Icon name="key-outline" size={22} color={COLORS.primary} />
              <Text className="flex-1 ml-3 text-base text-gray-900">Change Password</Text>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Privacy Settings */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Privacy
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">
                  Data Sharing
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Share anonymous usage data for analytics
                </Text>
              </View>
              <Switch
                value={settings.dataSharing}
                onValueChange={() => toggleSetting('dataSharing')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">
                  Marketing Emails
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Receive promotional offers and updates
                </Text>
              </View>
              <Switch
                value={settings.marketingEmails}
                onValueChange={() => toggleSetting('marketingEmails')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Data Management */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Data Management
            </Text>

            <TouchableOpacity
              onPress={handleExportData}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Icon name="download-outline" size={22} color={COLORS.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900 font-medium">
                  Export Personal Data
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Download a copy of your data
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ActivityLog')}
              className="flex-row items-center py-3"
            >
              <Icon name="time-outline" size={22} color={COLORS.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900 font-medium">
                  Activity Log
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  View your account activity (Coming Soon)
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Danger Zone - Only show for customer/admin users, not for business */}
          {user?.role !== 'business' && (
            <View className="bg-white rounded-2xl p-6 shadow-sm mb-6 border-2 border-red-100">
              <Text className="text-lg font-bold text-red-600 mb-4">
                Danger Zone
              </Text>

              <TouchableOpacity
                onPress={handleDeactivateAccount}
                className="flex-row items-center py-3 border-b border-gray-100"
              >
                <Icon name="pause-circle-outline" size={22} color="#F59E0B" />
                <View className="flex-1 ml-3">
                  <Text className="text-base text-gray-900 font-medium">
                    Deactivate Account
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Temporarily disable your account
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('DeleteAccount')}
                className="flex-row items-center py-3"
              >
                <Icon name="trash-outline" size={22} color="#DC2626" />
                <View className="flex-1 ml-3">
                  <Text className="text-base text-red-600 font-medium">
                    Delete Account
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Permanently delete your account
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
