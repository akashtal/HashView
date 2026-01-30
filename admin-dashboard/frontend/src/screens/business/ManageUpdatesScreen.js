import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../config/colors';
import { API_CONFIG } from '../../config/api.config';

export default function ManageUpdatesScreen({ navigation, route }) {
  const { businessId } = route.params || {};
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'offer',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    validUntil: new Date(),
    image: null
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/business/${businessId}/updates`);
      const data = await response.json();

      if (data.success) {
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      Alert.alert('Error', 'Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (update = null) => {
    if (update) {
      setEditingUpdate(update);
      setFormData({
        type: update.type,
        title: update.title,
        description: update.description,
        discountType: update.discountType || 'percentage',
        discountValue: update.discountValue?.toString() || '',
        validUntil: update.validUntil ? new Date(update.validUntil) : new Date(),
        image: update.image
      });
    } else {
      setEditingUpdate(null);
      setFormData({
        type: 'offer',
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        validUntil: new Date(),
        image: null
      });
    }
    setModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormData({ ...formData, image: result.assets[0] });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    try {
      setSubmitting(true);

      // Get auth token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      // TODO: Upload image to Cloudinary if new image selected
      // For now, we'll just send the data

      const payload = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: formData.discountValue ? parseFloat(formData.discountValue) : 0,
        validUntil: formData.validUntil.toISOString(),
        image: formData.image?.url || null
      };

      const url = editingUpdate
        ? `${API_CONFIG.BASE_URL}/updates/${editingUpdate._id}`
        : `${API_CONFIG.BASE_URL}/business/${businessId}/updates`;

      const method = editingUpdate ? 'PUT' : 'POST';

      console.log('📤 Sending request to:', url);
      console.log('🔑 With token:', token ? 'Present' : 'Missing');

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', editingUpdate ? 'Update saved successfully' : 'Update created successfully');
        setModalVisible(false);
        fetchUpdates();
      } else {
        Alert.alert('Error', data.message || 'Failed to save update');
      }
    } catch (error) {
      console.error('Error saving update:', error);
      Alert.alert('Error', 'Failed to save update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (update) => {
    Alert.alert(
      'Delete Update',
      'Are you sure you want to delete this update?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'You are not logged in. Please log in again.');
                return;
              }

              const response = await fetch(`${API_CONFIG.BASE_URL}/updates/${update._id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Update deleted successfully');
                fetchUpdates();
              } else {
                Alert.alert('Error', 'Failed to delete update');
              }
            } catch (error) {
              console.error('Error deleting update:', error);
              Alert.alert('Error', 'Failed to delete update');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (update) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/updates/${update._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !update.isActive })
      });

      const data = await response.json();

      if (data.success) {
        fetchUpdates();
      } else {
        Alert.alert('Error', 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert('Error', 'Failed to update status');
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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Manage Updates & Offers</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 py-6">
          {updates.length === 0 ? (
            <View className="items-center py-20">
              <Icon name="megaphone-outline" size={80} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg mt-4">No updates yet</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Create your first update or offer
              </Text>
            </View>
          ) : (
            updates.map((update) => (
              <View key={update._id} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                {update.image?.url && (
                  <Image
                    source={{ uri: update.image.url }}
                    className="w-full h-40 rounded-lg mb-3"
                    resizeMode="cover"
                  />
                )}

                <View className="flex-row items-center justify-between mb-2">
                  <View style={{
                    backgroundColor: update.type === 'offer' ? COLORS.secondary + '20' : COLORS.primary + '20',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      color: update.type === 'offer' ? COLORS.secondary : COLORS.primary,
                      fontSize: 11,
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {update.type}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleToggleActive(update)}
                      className="mr-3"
                    >
                      <Icon
                        name={update.isActive ? "eye" : "eye-off"}
                        size={22}
                        color={update.isActive ? COLORS.primary : '#9CA3AF'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenModal(update)}
                      className="mr-3"
                    >
                      <Icon name="pencil" size={22} color={COLORS.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDelete(update)}>
                      <Icon name="trash" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-lg font-bold text-gray-900 mb-2">{update.title}</Text>
                <Text className="text-sm text-gray-600 mb-3">{update.description}</Text>

                {update.type === 'offer' && update.discountValue > 0 && (
                  <View style={{
                    backgroundColor: COLORS.secondary + '10',
                    padding: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <Icon name="pricetag" size={16} color={COLORS.secondary} />
                    <Text style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: COLORS.secondary,
                      marginLeft: 6
                    }}>
                      {update.discountType === 'percentage' ? `${update.discountValue}% OFF` : `₹${update.discountValue} OFF`}
                    </Text>
                    {update.validUntil && (
                      <Text className="text-xs text-gray-600 ml-auto">
                        Valid till {new Date(update.validUntil).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                <View className="flex-row items-center mt-3">
                  <Icon name="time" size={14} color="#9CA3AF" />
                  <Text className="text-xs text-gray-500 ml-1">
                    Created: {new Date(update.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={{
                    marginLeft: 'auto',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: update.isActive ? '#10B981' : '#EF4444',
                      marginRight: 6
                    }} />
                    <Text className="text-xs font-semibold" style={{
                      color: update.isActive ? '#10B981' : '#EF4444'
                    }}>
                      {update.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => handleOpenModal()}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}
      >
        <LinearGradient
          colors={[COLORS.secondary, COLORS.secondaryDark]}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon name="add" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            className="pt-12 pb-6 px-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <TouchableOpacity onPress={() => setModalVisible(false)} className="mr-4">
                  <Icon name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">
                  {editingUpdate ? 'Edit Update' : 'Create Update'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView className="flex-1 px-6 py-6">
            {/* Type Selection */}
            <View className="mb-6">
              <Text className="text-gray-900 font-semibold mb-3">Type</Text>
              <View className="flex-row items-center gap-2 flex-wrap">
                {['offer', 'update', 'announcement'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({ ...formData, type })}
                    className={`px-4 py-3 rounded-xl border ${formData.type === type
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-gray-200'
                      }`}
                  >
                    <Text className={`font-semibold capitalize ${formData.type === type ? 'text-white' : 'text-gray-600'
                      }`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View className="mb-4">
              <Text className="text-gray-900 font-semibold mb-2">Title *</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                placeholder="e.g., 50% Off This Weekend!"
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(value) => setFormData({ ...formData, title: value })}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-gray-900 font-semibold mb-2">Description *</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                placeholder="Describe your offer or update..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(value) => setFormData({ ...formData, description: value })}
                maxLength={500}
              />
            </View>

            {/* Offer-specific fields */}
            {formData.type === 'offer' && (
              <>
                <View className="mb-6">
                  <Text className="text-gray-900 font-semibold mb-3">Discount Type</Text>
                  <View className="flex-row items-center gap-2">
                    {[
                      { label: 'Percentage (%)', value: 'percentage' },
                      { label: 'Fixed Amount (₹)', value: 'fixed' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setFormData({ ...formData, discountType: option.value })}
                        className={`flex-1 px-4 py-3 rounded-xl border items-center ${formData.discountType === option.value
                          ? 'bg-purple-600 border-purple-600'
                          : 'bg-white border-gray-200'
                          }`}
                      >
                        <Text className={`font-bold ${formData.discountType === option.value ? 'text-white' : 'text-gray-600'
                          }`}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-900 font-semibold mb-2">Discount Value</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                    placeholder={formData.discountType === 'percentage' ? "e.g., 50" : "e.g., 100"}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formData.discountValue}
                    onChangeText={(value) => setFormData({ ...formData, discountValue: value })}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-900 font-semibold mb-2">Valid Until</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-900 font-medium">
                      {formData.validUntil.toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                    <Icon name="calendar-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <View className="mt-2 bg-white rounded-xl border border-gray-100 p-2">
                      <DateTimePicker
                        value={formData.validUntil}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={(event, selectedDate) => {
                          const currentDate = selectedDate || formData.validUntil;
                          setShowDatePicker(Platform.OS === 'ios'); // Keep open for iOS inline, close for Android default
                          setFormData({ ...formData, validUntil: currentDate });
                        }}
                        minimumDate={new Date()}
                        style={Platform.OS === 'ios' ? { height: 320 } : {}}
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(false)}
                          className="bg-purple-600 py-3 rounded-lg mt-2 items-center"
                        >
                          <Text className="text-white font-bold">Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Image */}
            <View className="mb-6">
              <Text className="text-gray-900 font-semibold mb-2">Image (Optional)</Text>
              <TouchableOpacity
                onPress={pickImage}
                className="bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 py-8 items-center justify-center"
              >
                {formData.image ? (
                  <Image
                    source={{ uri: formData.image.uri || formData.image.url }}
                    className="w-full h-40 rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Icon name="image-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 mt-2">Select Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={submitting}
              className="mb-8"
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                className="rounded-xl py-4 items-center"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {editingUpdate ? 'Update' : 'Create'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
