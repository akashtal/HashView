import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function CategoryManagementScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'apps-outline',
    color: '#6B7280',
    order: 0
  });

  // Common icons for categories
  const commonIcons = [
    'restaurant', 'cafe', 'beer', 'pizza', 'ice-cream',
    'fitness', 'medkit', 'cut', 'car', 'home',
    'shirt', 'basket', 'book', 'game-controller', 'film',
    'briefcase', 'school', 'heart', 'paw', 'leaf'
  ];

  const commonColors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6B7280'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon || 'apps-outline',
        color: category.color || '#6B7280',
        order: category.order || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        icon: 'apps-outline',
        color: '#6B7280',
        order: 0
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }

    try {
      if (editingCategory) {
        await ApiService.updateCategory(editingCategory._id, formData);
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await ApiService.createCategory(formData);
        Alert.alert('Success', 'Category created successfully');
      }
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = (category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteCategory(category._id);
              Alert.alert('Success', 'Category deleted');
              fetchCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (category) => {
    try {
      await ApiService.updateCategory(category._id, {
        isActive: !category.isActive
      });
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category:', error);
      Alert.alert('Error', 'Failed to update category status');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        className="pt-12 pb-6 px-6"
        style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">Categories</Text>
            <Text className="text-white/80 text-sm">{categories.length} total categories</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleOpenModal()}
            className="rounded-full w-10 h-10 items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Icon name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Categories List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          {categories.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Icon name="apps-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-4 text-center">No categories yet</Text>
              <TouchableOpacity
                onPress={() => handleOpenModal()}
                className="mt-4 px-6 py-3 rounded-xl"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                <Text className="text-white font-semibold">Create First Category</Text>
              </TouchableOpacity>
            </View>
          ) : (
            categories.map((category) => (
              <View key={category._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-center">
                  <View
                    className="rounded-xl w-14 h-14 items-center justify-center mr-4"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <Icon name={category.icon} size={28} color={category.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">{category.name}</Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      Order: {category.order} • {category.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleToggleActive(category)}
                      className="w-10 h-10 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: category.isActive ? '#10B98120' : '#EF444420' }}
                    >
                      <Icon
                        name={category.isActive ? 'eye' : 'eye-off'}
                        size={20}
                        color={category.isActive ? '#10B981' : '#EF4444'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleOpenModal(category)}
                      className="w-10 h-10 rounded-full items-center justify-center mr-2"
                      style={{ backgroundColor: '#3B82F620' }}
                    >
                      <Icon name="create" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(category)}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#EF444420' }}
                    >
                      <Icon name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Name */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Category Name *</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="e.g., Restaurant, Cafe, Hotel"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              {/* Icon Selection */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Icon</Text>
                <View className="flex-row flex-wrap">
                  {commonIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      onPress={() => setFormData({ ...formData, icon })}
                      className="w-12 h-12 rounded-xl items-center justify-center m-1"
                      style={{
                        backgroundColor: formData.icon === icon ? '#8B5CF6' : '#F3F4F6'
                      }}
                    >
                      <Icon
                        name={icon}
                        size={24}
                        color={formData.icon === icon ? '#FFF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Selection */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Color</Text>
                <View className="flex-row flex-wrap">
                  {commonColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setFormData({ ...formData, color })}
                      className="w-12 h-12 rounded-xl m-1"
                      style={{
                        backgroundColor: color,
                        borderWidth: formData.color === color ? 3 : 0,
                        borderColor: '#FFF'
                      }}
                    >
                      {formData.color === color && (
                        <View className="flex-1 items-center justify-center">
                          <Icon name="checkmark" size={24} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Order */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Display Order</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(formData.order)}
                  onChangeText={(text) => setFormData({ ...formData, order: parseInt(text) || 0 })}
                />
              </View>

              {/* Preview */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Preview</Text>
                <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center">
                  <View
                    className="rounded-xl w-14 h-14 items-center justify-center mr-4"
                    style={{ backgroundColor: formData.color + '20' }}
                  >
                    <Icon name={formData.icon} size={28} color={formData.color} />
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    {formData.name || 'Category Name'}
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                <Text className="text-white font-bold text-base">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

