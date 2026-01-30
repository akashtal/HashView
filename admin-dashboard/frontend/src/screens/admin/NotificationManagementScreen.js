import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  StatusBar,
  Modal,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function NotificationManagementScreen({ navigation }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipientType: 'all_users', // 'all_users', 'all_businesses', 'specific_user', 'specific_business'
    recipientIds: []
  });
  
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, businessesRes] = await Promise.all([
        ApiService.adminGetAllUsers(),
        ApiService.adminGetAllBusinesses()
      ]);
      setUsers(usersRes.users || []);
      setBusinesses(businessesRes.businesses || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const recipientTypes = [
    { key: 'all_users', label: 'All Users', icon: 'people', color: '#3B82F6', description: 'Send to all registered users' },
    { key: 'all_businesses', label: 'All Businesses', icon: 'business', color: '#10B981', description: 'Send to all business owners' },
    { key: 'specific_user', label: 'Specific User', icon: 'person', color: '#8B5CF6', description: 'Select specific users' },
    { key: 'specific_business', label: 'Specific Business', icon: 'storefront', color: '#F59E0B', description: 'Select specific businesses' }
  ];

  const getFilteredItems = () => {
    const items = formData.recipientType === 'specific_user' ? users : businesses;
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      (formData.recipientType === 'specific_user' ? item.phoneNumber?.toLowerCase().includes(query) : item.category?.toLowerCase().includes(query))
    );
  };

  const toggleRecipient = (id) => {
    if (formData.recipientIds.includes(id)) {
      setFormData({
        ...formData,
        recipientIds: formData.recipientIds.filter(rid => rid !== id)
      });
    } else {
      setFormData({
        ...formData,
        recipientIds: [...formData.recipientIds, id]
      });
    }
  };

  const getRecipientName = (id) => {
    const item = formData.recipientType === 'specific_user'
      ? users.find(u => u._id === id)
      : businesses.find(b => b._id === id);
    return item?.name || 'Unknown';
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }

    if ((formData.recipientType === 'specific_user' || formData.recipientType === 'specific_business') 
        && formData.recipientIds.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient');
      return;
    }

    Alert.alert(
      'Confirm Send',
      `Send notification to ${getRecipientSummary()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setLoading(true);
            try {
              const payload = {
                title: formData.title,
                message: formData.message,
                recipientType: formData.recipientType,
                recipientIds: formData.recipientIds.length > 0 ? formData.recipientIds : undefined
              };

              const response = await ApiService.sendAdminNotification(payload);
              Alert.alert('Success', response.message || 'Notification sent successfully!');
              setFormData({
                title: '',
                message: '',
                recipientType: 'all_users',
                recipientIds: []
              });
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to send notification');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getRecipientSummary = () => {
    switch (formData.recipientType) {
      case 'all_users':
        return `All Users (${users.length})`;
      case 'all_businesses':
        return `All Businesses (${businesses.length})`;
      case 'specific_user':
        return `${formData.recipientIds.length} Selected User(s)`;
      case 'specific_business':
        return `${formData.recipientIds.length} Selected Business(es)`;
      default:
        return '';
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
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Send Notifications</Text>
          </View>
        </View>
        <Text className="text-white text-sm opacity-80">
          Send push notifications to users and businesses
        </Text>
      </LinearGradient>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Recipient Type Selection */}
        <Text className="text-gray-900 font-bold text-lg mb-3">Send To</Text>
        <View className="flex-row flex-wrap mb-6">
          {recipientTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() => setFormData({ ...formData, recipientType: type.key, recipientIds: [] })}
              className="w-1/2 p-2"
              activeOpacity={0.7}
            >
              <View style={{
                backgroundColor: formData.recipientType === type.key ? type.color + '15' : '#F9FAFB',
                borderWidth: 2,
                borderColor: formData.recipientType === type.key ? type.color : '#E5E7EB',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                minHeight: 110
              }}>
                <View style={{
                  backgroundColor: formData.recipientType === type.key ? type.color : '#D1D5DB',
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Icon name={type.icon} size={24} color="#FFF" />
                </View>
                <Text style={{
                  fontSize: 13,
                  fontWeight: 'bold',
                  color: formData.recipientType === type.key ? type.color : '#374151',
                  textAlign: 'center',
                  marginBottom: 4
                }}>
                  {type.label}
                </Text>
                <Text style={{
                  fontSize: 10,
                  color: '#9CA3AF',
                  textAlign: 'center'
                }}>
                  {type.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Specific Recipient Selection */}
        {(formData.recipientType === 'specific_user' || formData.recipientType === 'specific_business') && (
          <View className="mb-6">
            <Text className="text-gray-900 font-semibold mb-2">
              Select {formData.recipientType === 'specific_user' ? 'Users' : 'Businesses'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowRecipientModal(true)}
              className="bg-white rounded-xl p-4 border border-gray-200"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Icon name="search" size={20} color={COLORS.primary} />
                  <Text className="text-gray-600 ml-2">
                    {formData.recipientIds.length > 0 
                      ? `${formData.recipientIds.length} selected` 
                      : 'Search and select...'}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            {/* Selected Recipients */}
            {formData.recipientIds.length > 0 && (
              <View className="mt-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {formData.recipientIds.map(id => (
                    <View key={id} className="bg-primary-100 rounded-full px-3 py-2 mr-2 flex-row items-center">
                      <Text className="text-primary-800 text-sm font-medium mr-2">
                        {getRecipientName(id)}
                      </Text>
                      <TouchableOpacity onPress={() => toggleRecipient(id)}>
                        <Icon name="close-circle" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Title */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Notification Title</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            placeholder="Enter title (max 65 chars)"
            placeholderTextColor="#9CA3AF"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={65}
          />
          <Text className="text-xs text-gray-500 mt-1 text-right">{formData.title.length}/65</Text>
        </View>

        {/* Message */}
        <View className="mb-6">
          <Text className="text-gray-900 font-semibold mb-2">Message</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            placeholder="Enter message (max 200 chars)"
            placeholderTextColor="#9CA3AF"
            value={formData.message}
            onChangeText={(text) => setFormData({ ...formData, message: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />
          <Text className="text-xs text-gray-500 mt-1 text-right">{formData.message.length}/200</Text>
        </View>

        {/* Preview */}
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <Text className="text-gray-900 font-semibold mb-3">Preview</Text>
          <View className="bg-gray-50 rounded-lg p-4 border-l-4" style={{ borderLeftColor: COLORS.primary }}>
            <View className="flex-row items-start">
              <View style={{
                backgroundColor: COLORS.primary,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Text className="text-white font-bold">HV</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">
                  {formData.title || 'Notification Title'}
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  {formData.message || 'Your notification message will appear here...'}
                </Text>
                <Text className="text-gray-400 text-xs mt-2">Just now</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recipients Summary */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <View className="flex-row items-center mb-2">
            <Icon name="information-circle" size={20} color="#3B82F6" />
            <Text className="text-blue-900 font-semibold ml-2">Recipients</Text>
          </View>
          <Text className="text-blue-700 text-sm">
            📢 {getRecipientSummary()}
          </Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            className="rounded-xl py-4 items-center flex-row justify-center"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="send" size={22} color="#FFF" />
                <Text className="text-white font-bold text-lg ml-2">
                  Send Notification
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Tips */}
        <View className="bg-gray-100 rounded-xl p-4 mt-6">
          <Text className="text-gray-900 font-semibold mb-2">💡 Best Practices</Text>
          <Text className="text-gray-600 text-sm mb-1">• Keep titles clear and concise</Text>
          <Text className="text-gray-600 text-sm mb-1">• Use actionable messages</Text>
          <Text className="text-gray-600 text-sm mb-1">• Test with specific users first</Text>
          <Text className="text-gray-600 text-sm">• Avoid sending too frequently</Text>
        </View>
      </ScrollView>

      {/* Recipient Selection Modal */}
      <Modal
        visible={showRecipientModal}
        animationType="slide"
        onRequestClose={() => setShowRecipientModal(false)}
      >
        <View className="flex-1 bg-white">
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            className="pt-12 pb-6 px-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <TouchableOpacity onPress={() => setShowRecipientModal(false)} className="mr-4">
                  <Icon name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text className="text-white text-xl font-bold">
                  Select {formData.recipientType === 'specific_user' ? 'Users' : 'Businesses'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Search */}
          <View className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <View className="bg-white rounded-xl px-4 py-2 flex-row items-center border border-gray-200">
              <Icon name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-gray-900"
                placeholder={`Search ${formData.recipientType === 'specific_user' ? 'users' : 'businesses'}...`}
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            {formData.recipientIds.length > 0 && (
              <Text className="text-sm text-primary-600 font-semibold mt-2">
                {formData.recipientIds.length} selected
              </Text>
            )}
          </View>

          {/* List */}
          <FlatList
            data={getFilteredItems()}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleRecipient(item._id)}
                className="px-6 py-4 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-gray-900 font-semibold">{item.name}</Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {formData.recipientType === 'specific_user' 
                        ? (item.email || item.phoneNumber)
                        : (item.category || item.address?.city)}
                    </Text>
                  </View>
                  {formData.recipientIds.includes(item._id) && (
                    <Icon name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center py-20">
                <Icon name="search-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-500 mt-4">No results found</Text>
              </View>
            }
          />

          {/* Done Button */}
          <View className="px-6 py-4 bg-white border-t border-gray-200">
            <TouchableOpacity
              onPress={() => setShowRecipientModal(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                className="rounded-xl py-3 items-center"
              >
                <Text className="text-white font-bold text-base">
                  Done ({formData.recipientIds.length} selected)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

