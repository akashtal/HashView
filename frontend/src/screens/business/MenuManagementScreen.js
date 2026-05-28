import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  Alert, Modal, StatusBar, KeyboardAvoidingView, Platform, Switch, Image, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import ToastService from '../../utils/ToastService';

// ─── Type options for the Add/Edit form ──────────────────────────────────────
const ITEM_TYPES = [
  { value: 'food',    label: 'Food',    icon: 'fast-food' },
  { value: 'drink',   label: 'Drink',   icon: 'beer' },
  { value: 'service', label: 'Service', icon: 'cut' },
  { value: 'product', label: 'Product', icon: 'cube' },
  { value: 'package', label: 'Package', icon: 'gift' },
  { value: 'room',    label: 'Room',    icon: 'bed' },
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free', 'kosher', 'organic'
];

const BLANK_FORM = {
  name: '', description: '', price: '',
  currency: 'GBP', menuCategory: '', type: 'food',
  tags: '', dietary: [], isAvailable: true,
  isPopular: false, duration: '',
};

// ─── Item Card Component ──────────────────────────────────────────────────────
const MenuItemCard = ({ item, onEdit, onDelete, onToggle }) => (
  <View
    style={{
      backgroundColor: '#FFF', borderRadius: 16, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      elevation: 2, flexDirection: 'row', overflow: 'hidden'
    }}
  >
    {/* Image */}
    {item.image?.url ? (
      <Image
        source={{ uri: item.image.url }}
        style={{ width: 80, height: 80 }}
        resizeMode="cover"
      />
    ) : (
      <View style={{ width: 80, height: 80, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="image-outline" size={28} color="#D1D5DB" />
      </View>
    )}

    {/* Info */}
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#111827' }} numberOfLines={1}>{item.name}</Text>
          {item.menuCategory ? (
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{item.menuCategory}</Text>
          ) : null}
        </View>
        <Text style={{ fontWeight: '700', fontSize: 15, color: '#6366F1' }}>
          {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{item.price.toFixed(2)}
        </Text>
      </View>

      {item.description ? (
        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }} numberOfLines={2}>{item.description}</Text>
      ) : null}

      {/* Badges */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
        {item.isPopular && (
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#92400E' }}>⭐ Popular</Text>
          </View>
        )}
        {item.dietary?.slice(0, 2).map(d => (
          <View key={d} style={{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#166534' }}>{d}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Actions */}
    <View style={{ justifyContent: 'space-around', paddingHorizontal: 10, paddingVertical: 8 }}>
      <Switch
        value={item.isAvailable}
        onValueChange={() => onToggle(item._id, item.isAvailable)}
        trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
        thumbColor="#FFF"
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
      />
      <TouchableOpacity onPress={() => onEdit(item)} style={{ padding: 4 }}>
        <Icon name="pencil" size={18} color="#6366F1" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Icon name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MenuManagementScreen({ route, navigation }) {
  const { businessId } = route.params;

  const [grouped, setGrouped] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [pickedImage, setPickedImage] = useState(null); // { uri, type, name }
  const [saving, setSaving] = useState(false);

  // ─── AI Menu Scanner state ─────────────────────────────────────────────────────────────
  const [aiScanning, setAiScanning] = useState(false);      // true while uploading/AI processing
  const [aiScanPickerVisible, setAiScanPickerVisible] = useState(false); // custom source picker
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);          // extracted drafts from AI
  const [savingBatch, setSavingBatch] = useState(false);

  // Refresh whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [menuRes, statsRes] = await Promise.all([
        ApiService.getMenuItems(businessId),
        ApiService.getMenuStats(businessId).catch(() => null)
      ]);
      setGrouped(menuRes.data || {});
      if (statsRes?.success) setStats(statsRes.data);
    } catch (e) {
      ToastService.showError('Error', 'Could not load menu items');
    } finally {
      setLoading(false);
    }
  };

  // ─── AI Menu Scanner ─────────────────────────────────────────────────────────────
  const handleAIScan = () => {
    setAiScanPickerVisible(true);
  };

  const launchAIScan = async (source) => {
    setAiScanPickerVisible(false); // close the custom picker first
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          return Alert.alert('Permission needed', 'Camera access is required to take a photo of your menu.');
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          return Alert.alert('Permission needed', 'Photo library access is required to upload your menu.');
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.9,
          allowsEditing: false,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setAiScanning(true);

      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('currency', 'GBP');
      formData.append('menuImage', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `menu-scan-${Date.now()}.jpg`,
      });

      const res = await ApiService.extractMenuFromImage(formData);
      // NOTE: mobile apiClient interceptor already unwraps response.data,
      // so `res` here IS the JSON body { success, count, data, message }
      if (!res?.success || !res?.data?.length) {
        ToastService.showError('No items found', 'AI could not extract any items. Try a clearer image.');
        return;
      }

      // Tag each item with a local ID and selected=true for the review modal
      const drafts = res.data.map((item, idx) => ({
        ...item,
        _localId: `draft_${idx}`,
        _selected: true,
      }));

      setReviewItems(drafts);
      setReviewModalVisible(true);
      ToastService.showSuccess('Scan complete', res.message);
    } catch (err) {
      ToastService.showError('Scan failed', err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setAiScanning(false);
    }
  };

  const handleBatchSave = async () => {
    const selected = reviewItems.filter(i => i._selected);
    if (selected.length === 0) {
      return Alert.alert('Nothing selected', 'Please select at least one item to save.');
    }

    try {
      setSavingBatch(true);
      const items = selected.map(({ _localId, _selected, ...rest }) => rest);
      const res = await ApiService.createMenuItemsBatch(businessId, items, true);
      setReviewModalVisible(false);
      setReviewItems([]);
      loadData();
      ToastService.showSuccess('Menu updated!', res.message);
    } catch (err) {
      ToastService.showError('Save failed', err.response?.data?.message || err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // ─── Open modal for Add ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...BLANK_FORM });
    setPickedImage(null);
    setModalVisible(true);
  };

  // ─── Open modal for Edit ──────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      currency: item.currency || 'GBP',
      menuCategory: item.menuCategory || '',
      type: item.type || 'food',
      tags: (item.tags || []).join(', '),
      dietary: item.dietary || [],
      isAvailable: item.isAvailable !== false,
      isPopular: item.isPopular || false,
      duration: item.duration?.toString() || '',
    });
    setPickedImage(null);
    setModalVisible(true);
  };

  // ─── Choose how to add image (Camera vs Gallery) ───────────────────────────
  const handleImageOption = () => {
    Alert.alert(
      'Add Item Photo',
      'Select an option to add an image for this menu item:',
      [
        { text: '📷 Take Photo (Camera)', onPress: takePhoto },
        { text: '🖼️ Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take item photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedImage({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `menu-item-${Date.now()}.jpg`
      });
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add item images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedImage({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `menu-item-${Date.now()}.jpg`
      });
    }
  };

  // ─── Toggle dietary label ──────────────────────────────────────────────────
  const toggleDietary = (label) => {
    setForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(label)
        ? prev.dietary.filter(d => d !== label)
        : [...prev.dietary, label]
    }));
  };

  // ─── Save (create or update) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) return ToastService.showError('Validation', 'Item name is required');
    if (!form.price || isNaN(parseFloat(form.price))) return ToastService.showError('Validation', 'A valid price is required');

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('price', parseFloat(form.price).toString());
      formData.append('currency', form.currency);
      formData.append('menuCategory', form.menuCategory.trim());
      formData.append('type', form.type);
      formData.append('tags', form.tags.trim());
      formData.append('isAvailable', form.isAvailable ? 'true' : 'false');
      formData.append('isPopular', form.isPopular ? 'true' : 'false');
      if (form.duration) formData.append('duration', form.duration);
      // Dietary as JSON string
      formData.append('dietary', JSON.stringify(form.dietary));

      if (pickedImage) {
        formData.append('image', {
          uri: pickedImage.uri,
          type: pickedImage.type,
          name: pickedImage.name,
        });
      }

      if (editingItem) {
        await ApiService.updateMenuItem(editingItem._id, formData);
        ToastService.showSuccess('Updated', `"${form.name}" updated successfully`);
      } else {
        await ApiService.createMenuItem(formData);
        ToastService.showSuccess('Added', `"${form.name}" added to your menu`);
      }

      setModalVisible(false);
      loadData();
    } catch (e) {
      ToastService.showError('Save failed', e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete with confirmation ─────────────────────────────────────────────
  const handleDelete = (item) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" from your menu? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteMenuItem(item._id);
              ToastService.showSuccess('Deleted', `"${item.name}" removed`);
              loadData();
            } catch (e) {
              ToastService.showError('Error', e.message);
            }
          }
        }
      ]
    );
  };

  // ─── Toggle availability ──────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      await ApiService.toggleMenuItemAvailability(id);
      loadData();
    } catch (e) {
      ToastService.showError('Error', e.message);
    }
  };

  const totalItems = Object.values(grouped).flat().length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={{ paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }} activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>Menu & Services</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
              Manage your offerings — visible to users & AI search
            </Text>
          </View>
          {/* ✨ AI Scan Button */}
          <TouchableOpacity
            onPress={handleAIScan}
            disabled={aiScanning}
            activeOpacity={0.8}
            style={{
              backgroundColor: 'rgba(253,230,138,0.18)',
              borderRadius: 12,
              paddingHorizontal: 11,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 8,
              borderWidth: 1,
              borderColor: 'rgba(253,230,138,0.45)',
            }}
          >
            {aiScanning ? (
              <ActivityIndicator size="small" color="#FDE68A" />
            ) : (
              <>
                <Icon name="sparkles" size={14} color="#FDE68A" />
                <Text style={{ color: '#FDE68A', fontWeight: '700', marginLeft: 4, fontSize: 12 }}>
                  AI Scan
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Manual Add Button */}
          <TouchableOpacity
            onPress={openAdd}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}
            activeOpacity={0.8}
          >
            <Icon name="add" size={18} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '600', marginLeft: 4, fontSize: 13 }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 20 }}>{stats.active}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Active</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 20 }}>{stats.popular}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Popular</Text>
            </View>
            {stats.priceRange && (
              <View style={{ flex: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                  £{stats.priceRange.min?.toFixed(0)} – £{stats.priceRange.max?.toFixed(0)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Price Range</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading menu...</Text>
        </View>
      ) : totalItems === 0 ? (
        /* Empty State */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Icon name="restaurant-outline" size={36} color="#6366F1" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            No items yet
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
            Add your menu, services, or products. They'll appear in user listings and power the AI discovery search.
          </Text>
          <TouchableOpacity
            onPress={openAdd}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}
          >
            <LinearGradient colors={['#4F46E5', '#6366F1']} style={{ paddingHorizontal: 32, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="add-circle-outline" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Add First Item</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* AI Scan option on empty state */}
          <TouchableOpacity
            onPress={handleAIScan}
            disabled={aiScanning}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <LinearGradient colors={['#7C3AED', '#6366F1']} style={{ paddingHorizontal: 28, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' }}>
              {aiScanning ? (
                <ActivityIndicator size="small" color="#FDE68A" />
              ) : (
                <Icon name="sparkles" size={18} color="#FDE68A" />
              )}
              <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 14 }}>
                {aiScanning ? 'Scanning...' : '✨ Scan Menu with AI'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* AI search info banner */}
          <View style={{ backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start' }}>
            <Icon name="sparkles" size={18} color="#6366F1" />
            <Text style={{ color: '#4338CA', fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 18 }}>
              <Text style={{ fontWeight: '700' }}>AI Search Ready.</Text> Your items are now searchable by AI — customers can find you by saying "chicken under £15 near me" or "vegan options".
            </Text>
          </View>

          {/* Grouped sections */}
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: '#374151', flex: 1 }}>{category}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
              </View>
              {items.map(item => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
              <View style={{ height: 12 }} />
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>

            {/* Modal Header */}
            <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 16 }}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: 17, color: '#111827' }}>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: '#6366F1', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                    {editingItem ? 'Save' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

              {/* Item Type Selector */}
              <Text style={styles.label}>Item Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                {ITEM_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm(prev => ({ ...prev, type: t.value }))}
                    style={[styles.typeChip, form.type === t.value && styles.typeChipActive]}
                  >
                    <Icon name={t.icon} size={16} color={form.type === t.value ? '#FFF' : '#6B7280'} />
                    <Text style={[styles.typeChipText, form.type === t.value && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Name */}
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Chicken Tikka Masala"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
              />

              {/* Category within menu */}
              <Text style={styles.label}>Menu Section / Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Starters, Mains, Haircuts, Rooms"
                placeholderTextColor="#9CA3AF"
                value={form.menuCategory}
                onChangeText={t => setForm(prev => ({ ...prev, menuCategory: t }))}
              />

              {/* Price */}
              <Text style={styles.label}>Price *</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="12.99"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={form.price}
                  onChangeText={t => setForm(prev => ({ ...prev, price: t }))}
                />
                <View style={[styles.input, { width: 80, marginBottom: 0, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#374151', fontWeight: '600' }}>
                    {form.currency === 'GBP' ? '£ GBP' : form.currency === 'USD' ? '$ USD' : '€ EUR'}
                  </Text>
                </View>
              </View>

              {/* Duration (services only) */}
              {form.type === 'service' && (
                <>
                  <Text style={styles.label}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 45"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={form.duration}
                    onChangeText={t => setForm(prev => ({ ...prev, duration: t }))}
                  />
                </>
              )}

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Brief description of this item..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={t => setForm(prev => ({ ...prev, description: t }))}
              />

              {/* Tags */}
              <Text style={styles.label}>Search Tags</Text>
              <Text style={styles.hint}>Comma-separated keywords to help AI find this item. e.g. chicken, spicy, curry</Text>
              <TextInput
                style={styles.input}
                placeholder="chicken, tikka, spicy, curry"
                placeholderTextColor="#9CA3AF"
                value={form.tags}
                onChangeText={t => setForm(prev => ({ ...prev, tags: t }))}
              />

              {/* Dietary Labels */}
              {(form.type === 'food' || form.type === 'drink') && (
                <>
                  <Text style={styles.label}>Dietary Labels</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {DIETARY_OPTIONS.map(d => {
                      const active = form.dietary.includes(d);
                      return (
                        <TouchableOpacity
                          key={d}
                          onPress={() => toggleDietary(d)}
                          style={[styles.dietaryChip, active && styles.dietaryChipActive]}
                        >
                          <Text style={[styles.dietaryChipText, active && styles.dietaryChipTextActive]}>
                            {d}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Image */}
              <Text style={styles.label}>Item Image</Text>
              <TouchableOpacity onPress={handleImageOption} style={styles.imagePicker} activeOpacity={0.8}>
                {pickedImage ? (
                  <Image source={{ uri: pickedImage.uri }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                ) : editingItem?.image?.url ? (
                  <View>
                    <Image source={{ uri: editingItem.image.url }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ textAlign: 'center', marginTop: 8, color: '#6366F1', fontSize: 13, fontWeight: '600' }}>Tap to replace image</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Icon name="camera-outline" size={32} color="#9CA3AF" />
                    <Text style={{ color: '#6B7280', marginTop: 8, fontWeight: '500' }}>Add a photo</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>JPG, PNG or WebP · Max 8MB</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Available now</Text>
                  <Text style={styles.toggleHint}>Customers can see this item</Text>
                </View>
                <Switch
                  value={form.isAvailable}
                  onValueChange={v => setForm(prev => ({ ...prev, isAvailable: v }))}
                  trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Mark as Popular ⭐</Text>
                  <Text style={styles.toggleHint}>Shown with a Popular badge</Text>
                </View>
                <Switch
                  value={form.isPopular}
                  onValueChange={v => setForm(prev => ({ ...prev, isPopular: v }))}
                  trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
                  thumbColor="#FFF"
                />
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── AI Review Modal ─────────────────────────────────────────────────────────── */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !savingBatch && setReviewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>

          {/* Header */}
          <LinearGradient
            colors={['#7C3AED', '#6366F1']}
            style={{ paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 18, paddingHorizontal: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                disabled={savingBatch}
                style={{ marginRight: 14 }}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="sparkles" size={18} color="#FDE68A" />
                  <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginLeft: 6 }}>AI Scan Results</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3 }}>
                  {reviewItems.filter(i => i._selected).length} of {reviewItems.length} items selected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const allSelected = reviewItems.every(i => i._selected);
                  setReviewItems(prev => prev.map(i => ({ ...i, _selected: !allSelected })));
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>
                  {reviewItems.every(i => i._selected) ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info banner */}
            <View style={{ marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="information-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginLeft: 8, flex: 1, lineHeight: 16 }}>
                Review each item the AI found. Tap any field to edit it. Uncheck items you don't want to save. Then tap "Save to Menu".
              </Text>
            </View>
          </LinearGradient>

          {/* Items List */}
          <FlatList
            data={reviewItems}
            keyExtractor={item => item._localId}
            contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item, index }) => (
              <View style={[
                reviewItemStyles.card,
                !item._selected && reviewItemStyles.cardDimmed,
              ]}>
                {/* Selection toggle + category badge row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={() => setReviewItems(prev =>
                      prev.map(i => i._localId === item._localId ? { ...i, _selected: !i._selected } : i)
                    )}
                    style={{ marginRight: 10 }}
                  >
                    <View style={[
                      reviewItemStyles.checkbox,
                      item._selected && reviewItemStyles.checkboxChecked,
                    ]}>
                      {item._selected && <Icon name="checkmark" size={13} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    {/* Editable name */}
                    <TextInput
                      style={reviewItemStyles.nameInput}
                      value={item.name}
                      onChangeText={val => setReviewItems(prev =>
                        prev.map(i => i._localId === item._localId ? { ...i, name: val } : i)
                      )}
                      placeholder="Item name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  {/* Popularity badge */}
                  {item.isPopular && (
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>⭐ Popular</Text>
                    </View>
                  )}
                </View>

                {/* Category + Price row */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={reviewItemStyles.fieldLabel}>Category</Text>
                    <TextInput
                      style={reviewItemStyles.fieldInput}
                      value={item.menuCategory}
                      onChangeText={val => setReviewItems(prev =>
                        prev.map(i => i._localId === item._localId ? { ...i, menuCategory: val } : i)
                      )}
                      placeholder="e.g. Mains"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={reviewItemStyles.fieldLabel}>Price (£)</Text>
                    <TextInput
                      style={reviewItemStyles.fieldInput}
                      value={item.price?.toString()}
                      onChangeText={val => setReviewItems(prev =>
                        prev.map(i => i._localId === item._localId ? { ...i, price: val } : i)
                      )}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {/* Description */}
                {item.description ? (
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 17 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Dietary tags */}
                {item.dietary?.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {item.dietary.map(d => (
                      <View key={d} style={{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#166534' }}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          />

          {/* Footer Save Button */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
            paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 14,
          }}>
            <Text style={{ textAlign: 'center', fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
              {reviewItems.filter(i => i._selected).length} item{reviewItems.filter(i => i._selected).length !== 1 ? 's' : ''} will be added to your menu
            </Text>
            <TouchableOpacity
              onPress={handleBatchSave}
              disabled={savingBatch || reviewItems.filter(i => i._selected).length === 0}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={savingBatch ? ['#A5B4FC', '#C4B5FD'] : ['#7C3AED', '#6366F1']}
                style={{
                  paddingVertical: 16, flexDirection: 'row',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {savingBatch ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                      Save {reviewItems.filter(i => i._selected).length} Item{reviewItems.filter(i => i._selected).length !== 1 ? 's' : ''} to Menu
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── AI Scan Source Picker (custom bottom sheet) ───────────────────────── */}
      <Modal
        visible={aiScanPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAiScanPickerVisible(false)}
      >
        {/* Backdrop — tap to dismiss */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          activeOpacity={1}
          onPress={() => setAiScanPickerVisible(false)}
        />

        {/* Sheet */}
        <View style={{
          backgroundColor: '#FFF',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: 'hidden',
          paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        }}>

          {/* Gradient header */}
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            style={{ paddingTop: 24, paddingBottom: 22, paddingHorizontal: 24, alignItems: 'center' }}
          >
            {/* Drag handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 18 }} />

            {/* Icon ring */}
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
            }}>
              <Icon name="sparkles" size={30} color="#FDE68A" />
            </View>

            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 }}>
              AI Menu Scanner
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 }}>
              Photograph your printed menu and AI will extract every item in seconds
            </Text>
          </LinearGradient>

          {/* Options */}
          <View style={{ padding: 20, gap: 12 }}>

            {/* Camera option */}
            <TouchableOpacity
              onPress={() => launchAIScan('camera')}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#F5F3FF',
                borderRadius: 18, padding: 18,
                borderWidth: 1.5, borderColor: '#DDD6FE',
              }}
            >
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: '#7C3AED',
                alignItems: 'center', justifyContent: 'center',
                marginRight: 16,
              }}>
                <Icon name="camera" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F1235', marginBottom: 3 }}>
                  Take a Photo
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }}>
                  Use your camera to photograph the menu now
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#A78BFA" />
            </TouchableOpacity>

            {/* Gallery option */}
            <TouchableOpacity
              onPress={() => launchAIScan('gallery')}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#EFF6FF',
                borderRadius: 18, padding: 18,
                borderWidth: 1.5, borderColor: '#BFDBFE',
              }}
            >
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: '#3B82F6',
                alignItems: 'center', justifyContent: 'center',
                marginRight: 16,
              }}>
                <Icon name="images" size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 3 }}>
                  Choose from Gallery
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }}>
                  Upload an existing photo of your menu
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#60A5FA" />
            </TouchableOpacity>

            {/* Tip strip */}
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start',
              backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: '#FDE68A', marginTop: 4,
            }}>
              <Icon name="bulb-outline" size={16} color="#D97706" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
                <Text style={{ fontWeight: '700' }}>Tip: </Text>
                Ensure the menu is flat, well-lit and all text is visible for the best results.
              </Text>
            </View>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setAiScanPickerVisible(false)}
              activeOpacity={0.7}
              style={{
                alignItems: 'center', paddingVertical: 14,
                borderRadius: 14, backgroundColor: '#F3F4F6',
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#6B7280' }}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  hint: { fontSize: 12, color: '#6B7280', marginBottom: 6, marginTop: -4 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', marginBottom: 18
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    backgroundColor: '#FFF'
  },
  typeChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  typeChipText: { color: '#6B7280', fontSize: 13, fontWeight: '500', marginLeft: 5 },
  typeChipTextActive: { color: '#FFF' },
  dietaryChip: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF'
  },
  dietaryChipActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  dietaryChipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  dietaryChipTextActive: { color: '#15803D' },
  imagePicker: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', borderRadius: 14, marginBottom: 20, overflow: 'hidden'
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6'
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
};

// ─── Review Modal Styles ───────────────────────────────────────────────────────
const reviewItemStyles = {
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardDimmed: {
    opacity: 0.45,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  nameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 3,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
};
