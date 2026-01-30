import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import ApiService from '../../services/api.service';
import { updateUser } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profileImage: user?.profileImage || null,
  });

  const [errors, setErrors] = useState({});

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to update your profile picture.'
          );
        }
      }
    })();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (Platform.OS !== 'ios') {
      if (!formData.phone || !/^[0-9]{10,15}$/.test(formData.phone)) {
        newErrors.phone = 'Phone number must be 10-15 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploading(true);

        // Create FormData for image upload
        const imageData = new FormData();
        imageData.append('profileImage', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });

        // Upload image
        const uploadResponse = await ApiService.uploadProfileImage(imageData);

        const newImageUrl = uploadResponse.url;

        setFormData({
          ...formData,
          profileImage: newImageUrl,
        });

        // Update Redux store immediately so ProfileScreen shows new image
        dispatch(updateUser({ ...user, profileImage: newImageUrl }));

        showMessage({
          message: 'Profile picture updated!',
          type: 'success',
        });

        setUploading(false);
      }
    } catch (error) {
      setUploading(false);
      console.error('Image upload error:', error);
      showMessage({
        message: 'Failed to upload image',
        description: error.message,
        type: 'danger',
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showMessage({
        message: 'Validation Error',
        description: 'Please fix the errors before saving',
        type: 'warning',
      });
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      };

      if (formData.profileImage) {
        updateData.profileImage = formData.profileImage;
      }

      const response = await ApiService.updateProfile(updateData);

      // Update Redux store
      dispatch(updateUser(response.user));

      showMessage({
        message: 'Profile Updated!',
        description: 'Your profile has been updated successfully',
        type: 'success',
      });

      setLoading(false);

      // Navigate back after short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1000);

    } catch (error) {
      setLoading(false);
      console.error('Update profile error:', error);
      showMessage({
        message: 'Update Failed',
        description: error.message || 'Failed to update profile',
        type: 'danger',
      });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-10 pb-2 px-4"
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-white rounded-full"
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text className="font-semibold" style={{ color: COLORS.primary }}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-6">
        {/* Profile Picture */}
        <View className="items-center -mt-16 mb-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg w-full">
            <View className="items-center">
              <TouchableOpacity
                onPress={pickImage}
                disabled={uploading}
                className="relative"
              >
                {formData.profileImage ? (
                  <Image
                    source={{ uri: formData.profileImage }}
                    className="w-28 h-28 rounded-full"
                  />
                ) : (
                  <View
                    className="w-28 h-28 rounded-full items-center justify-center"
                    style={{ backgroundColor: '#FFF9F0' }}
                  >
                    <Text className="text-4xl font-bold" style={{ color: COLORS.secondary }}>
                      {formData.name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}

                {/* Edit Icon Overlay */}
                <View
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center shadow-md"
                  style={{ backgroundColor: COLORS.secondary }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Icon name="camera" size={20} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>

              <Text className="text-gray-500 text-sm mt-3">
                Tap to change profile picture
              </Text>
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Personal Information
          </Text>

          {/* Name Field */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Full Name</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <Icon name="person-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Enter your full name"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                editable={!loading}
              />
            </View>
            {errors.name && (
              <Text className="text-red-500 text-xs mt-1 ml-2">{errors.name}</Text>
            )}
          </View>

          {/* Email Field */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Email Address</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
              <Icon name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
            {errors.email && (
              <Text className="text-red-500 text-xs mt-1 ml-2">{errors.email}</Text>
            )}
          </View>

          {/* Phone Field */}
          {Platform.OS !== 'ios' && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
              <View className="flex-row items-center border border-gray-300 rounded-xl px-4 py-3 bg-gray-50">
                <Icon name="call-outline" size={20} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-900"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') });
                    if (errors.phone) setErrors({ ...errors, phone: null });
                  }}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!loading}
                />
              </View>
              {errors.phone && (
                <Text className="text-red-500 text-xs mt-1 ml-2">{errors.phone}</Text>
              )}
            </View>
          )}

          {/* Account Type (Read-only) */}
          <View className="mb-2">
            <Text className="text-sm font-medium text-gray-700 mb-2">Account Type</Text>
            <View
              className="flex-row items-center rounded-xl px-4 py-3"
              style={{ backgroundColor: '#FFF9F0' }}
            >
              <Icon name="shield-checkmark-outline" size={20} color={COLORS.secondary} />
              <Text className="flex-1 ml-3 text-base font-semibold capitalize" style={{ color: COLORS.secondary }}>
                {user?.role}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Verification */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Account Verification
          </Text>

          {/* Email Verification */}
          <View>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Icon
                    name="mail-outline"
                    size={20}
                    color={user?.emailVerified ? "#10B981" : "#9CA3AF"}
                  />
                  <Text className="text-base font-medium text-gray-900 ml-2">
                    Email Verification
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 mt-1 ml-7">{user?.email}</Text>
              </View>

              {user?.emailVerified ? (
                <View className="flex-row items-center">
                  <Icon name="checkmark-circle" size={20} color="#10B981" />
                  <Text className="text-green-600 font-medium ml-1">Verified</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => navigation.navigate('VerifyEmail')}
                  disabled={loading}
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: '#FFF9F0' }}
                >
                  <Text className="font-semibold" style={{ color: COLORS.secondary }}>
                    Verify
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>

        {/* Additional Options */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Account Security
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('ChangePassword')}
            className="flex-row items-center py-3 border-b border-gray-100"
          >
            <Icon name="key-outline" size={22} color={COLORS.primary} />
            <Text className="flex-1 ml-4 text-base text-gray-900">Change Password</Text>
            <Icon name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AccountSettings')}
            className="flex-row items-center py-3"
          >
            <Icon name="shield-outline" size={22} color={COLORS.primary} />
            <Text className="flex-1 ml-4 text-base text-gray-900">Privacy & Security</Text>
            <Icon name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Account Information
          </Text>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-600">Member Since</Text>
            <Text className="text-gray-900 font-medium">
              {new Date(user?.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-600">Account Status</Text>
            <View className="flex-row items-center">
              <Icon
                name="checkmark-circle"
                size={18}
                color="#10B981"
              />
              <Text className="ml-2 font-medium text-green-600">
                Active
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600">User ID</Text>
            <Text className="text-gray-900 font-mono text-xs">
              {user?._id?.slice(-8).toUpperCase()}
            </Text>
          </View>
        </View>

        <View className="pb-8" />
      </ScrollView>
    </View>
  );
}
