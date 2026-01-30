import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../config/colors';

export default function SettingsScreen({ navigation }) {
  // Settings State
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    locationServices: true,
    darkMode: false,
    biometricAuth: false,
    autoSync: true,
    dataUsage: 'wifi', // wifi, cellular, both
  });

  const toggleSetting = async (key) => {
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(`setting_${key}`, JSON.stringify(newValue));
      showMessage({
        message: 'Setting Updated',
        description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${newValue ? 'enabled' : 'disabled'}`,
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save setting error:', error);
    }
  };

  const setDataUsagePreference = async (preference) => {
    setSettings({ ...settings, dataUsage: preference });
    try {
      await AsyncStorage.setItem('setting_dataUsage', preference);
      showMessage({
        message: 'Data Usage Updated',
        description: `Data usage set to ${preference}`,
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save data usage error:', error);
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data including images and temporary files. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear specific cache keys
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key => key.startsWith('cache_'));
              await AsyncStorage.multiRemove(cacheKeys);

              showMessage({
                message: 'Cache Cleared',
                description: 'All cached data has been cleared',
                type: 'success',
              });
            } catch (error) {
              showMessage({
                message: 'Failed to clear cache',
                type: 'danger',
              });
            }
          }
        }
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultSettings = {
              pushNotifications: true,
              emailNotifications: true,
              locationServices: true,
              darkMode: false,
              biometricAuth: false,
              autoSync: true,
              dataUsage: 'wifi',
            };

            setSettings(defaultSettings);

            // Clear all setting keys from AsyncStorage
            try {
              const keys = await AsyncStorage.getAllKeys();
              const settingKeys = keys.filter(key => key.startsWith('setting_'));
              await AsyncStorage.multiRemove(settingKeys);

              showMessage({
                message: 'Settings Reset',
                description: 'All settings have been reset to default',
                type: 'success',
              });
            } catch (error) {
              showMessage({
                message: 'Failed to reset settings',
                type: 'danger',
              });
            }
          }
        }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.hashview.co.uk/privacy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://hashview.com/terms-of-service');
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
          <Text className="text-white text-2xl font-bold flex-1">Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1">
        <View className="px-6 py-4">
          {/* Notifications Settings */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Notifications
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Push Notifications</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Receive notifications about reviews, coupons, and updates
                </Text>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={() => toggleSetting('pushNotifications')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Email Notifications</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Get important updates via email
                </Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={() => toggleSetting('emailNotifications')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Privacy & Security */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Privacy & Security
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Location Services</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Required for geofencing and nearby businesses
                </Text>
              </View>
              <Switch
                value={settings.locationServices}
                onValueChange={() => toggleSetting('locationServices')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Biometric Authentication</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Use fingerprint or Face ID to login
                </Text>
              </View>
              <Switch
                value={settings.biometricAuth}
                onValueChange={() => toggleSetting('biometricAuth')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <TouchableOpacity
              onPress={() => navigation.navigate('AccountSettings')}
              className="flex-row items-center py-2"
            >
              <Icon name="shield-outline" size={22} color={COLORS.primary} />
              <Text className="flex-1 ml-3 text-base text-gray-900">Account Settings</Text>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* App Preferences */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              App Preferences
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Dark Mode</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Coming soon
                </Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={() => toggleSetting('darkMode')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
                disabled
              />
            </View>

            <View className="border-t border-gray-100 my-2" />

            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 font-medium">Auto Sync</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Automatically sync data when app opens
                </Text>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={() => toggleSetting('autoSync')}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Data Usage */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Data Usage
            </Text>

            <Text className="text-sm text-gray-600 mb-3">
              Control when to download images and videos
            </Text>

            {['wifi', 'cellular', 'both'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setDataUsagePreference(option)}
                className="flex-row items-center py-3 border-b border-gray-100"
              >
                <Icon
                  name={settings.dataUsage === option ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={settings.dataUsage === option ? COLORS.primary : '#D1D5DB'}
                />
                <Text className="ml-3 text-base text-gray-900 capitalize flex-1">
                  {option === 'both' ? 'Wi-Fi & Cellular' : option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Storage & Cache */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Storage & Cache
            </Text>

            <TouchableOpacity
              onPress={clearCache}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Icon name="trash-outline" size={22} color="#EF4444" />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900">Clear Cache</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Free up space by clearing cached data
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* About & Legal */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              About & Legal
            </Text>

            <TouchableOpacity
              onPress={openPrivacyPolicy}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Icon name="document-text-outline" size={22} color={COLORS.primary} />
              <Text className="flex-1 ml-3 text-base text-gray-900">Privacy Policy</Text>
              <Icon name="open-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openTermsOfService}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Icon name="document-text-outline" size={22} color={COLORS.primary} />
              <Text className="flex-1 ml-3 text-base text-gray-900">Terms of Service</Text>
              <Icon name="open-outline" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <View className="py-3">
              <Text className="text-sm text-gray-500">Version 1.0.0</Text>
              <Text className="text-xs text-gray-400 mt-1">
                © 2024 HashView. All rights reserved.
              </Text>
            </View>
          </View>

          {/* Danger Zone */}
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-6 border-2 border-red-100">
            <Text className="text-lg font-bold text-red-600 mb-4">
              Danger Zone
            </Text>

            <TouchableOpacity
              onPress={resetSettings}
              className="flex-row items-center py-3 border-b border-gray-100"
            >
              <Icon name="refresh-outline" size={22} color="#EF4444" />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900">Reset Settings</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Reset all settings to default values
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('DeleteAccount')}
              className="flex-row items-center py-3"
            >
              <Icon name="close-circle-outline" size={22} color="#DC2626" />
              <View className="flex-1 ml-3">
                <Text className="text-base text-red-600 font-medium">Delete Account</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Permanently delete your account and data
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
