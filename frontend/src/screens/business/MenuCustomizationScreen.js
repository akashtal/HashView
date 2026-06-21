import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../../services/api.service';
import ToastService from '../../utils/ToastService';
import COLORS from '../../config/colors';

export default function MenuCustomizationScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { menuItem, businessId } = route.params;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group Modal State
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    isRequired: false,
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
  });

  // Option Modal State
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [optionForm, setOptionForm] = useState({
    name: '',
    additionalPrice: '0',
    description: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getCustomizationGroups(menuItem._id);
      if (res.success) {
        setGroups(res.data);
      }
    } catch (e) {
      ToastService.showError('Error', 'Failed to load customizations');
    } finally {
      setLoading(false);
    }
  };

  // ─── Group Handlers ────────────────────────────────────────────────────────

  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      name: '',
      isRequired: false,
      selectionType: 'single',
      minSelections: 1,
      maxSelections: 1,
    });
    setGroupModalVisible(true);
  };

  const openEditGroup = (group) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      isRequired: group.isRequired,
      selectionType: group.selectionType,
      minSelections: group.minSelections || 1,
      maxSelections: group.maxSelections || 1,
    });
    setGroupModalVisible(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return ToastService.showError('Validation', 'Name is required');

    try {
      setSaving(true);
      const payload = {
        ...groupForm,
        businessId,
        menuItemId: menuItem._id,
      };

      if (editingGroup) {
        await ApiService.updateCustomizationGroup(editingGroup._id, payload);
        ToastService.showSuccess('Success', 'Group updated');
      } else {
        await ApiService.createCustomizationGroup(payload);
        ToastService.showSuccess('Success', 'Group created');
      }

      setGroupModalVisible(false);
      loadGroups();
    } catch (e) {
      ToastService.showError('Error', e.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = (group) => {
    Alert.alert('Delete Group', `Are you sure you want to delete "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteCustomizationGroup(group._id);
            ToastService.showSuccess('Deleted', 'Group removed');
            loadGroups();
          } catch (e) {
            ToastService.showError('Error', 'Failed to delete group');
          }
        },
      },
    ]);
  };

  // ─── Option Handlers ───────────────────────────────────────────────────────

  const openAddOption = (groupId) => {
    setActiveGroupId(groupId);
    setEditingOption(null);
    setOptionForm({ name: '', additionalPrice: '0', description: '' });
    setOptionModalVisible(true);
  };

  const openEditOption = (groupId, option) => {
    setActiveGroupId(groupId);
    setEditingOption(option);
    setOptionForm({
      name: option.name,
      additionalPrice: option.additionalPrice?.toString() || '0',
      description: option.description || '',
    });
    setOptionModalVisible(true);
  };

  const handleSaveOption = async () => {
    if (!optionForm.name.trim()) return ToastService.showError('Validation', 'Name is required');

    try {
      setSaving(true);
      const payload = {
        ...optionForm,
        additionalPrice: parseFloat(optionForm.additionalPrice) || 0,
        groupId: activeGroupId,
      };

      if (editingOption) {
        await ApiService.updateCustomizationOption(editingOption._id, payload);
        ToastService.showSuccess('Success', 'Option updated');
      } else {
        await ApiService.createCustomizationOption(payload);
        ToastService.showSuccess('Success', 'Option created');
      }

      setOptionModalVisible(false);
      loadGroups();
    } catch (e) {
      ToastService.showError('Error', e.message || 'Failed to save option');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = (option) => {
    Alert.alert('Delete Option', `Are you sure you want to delete "${option.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteCustomizationOption(option._id);
            ToastService.showSuccess('Deleted', 'Option removed');
            loadGroups();
          } catch (e) {
            ToastService.showError('Error', 'Failed to delete option');
          }
        },
      },
    ]);
  };

  // ─── UI Rendering ──────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={{ paddingTop: Math.max(insets.top, 24) + 10, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16, padding: 4 }}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }} numberOfLines={1}>Customizations</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} numberOfLines={1}>{menuItem.name}</Text>
          </View>
          <TouchableOpacity onPress={openAddGroup} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>+ Add Group</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : groups.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Icon name="options-outline" size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' }}>No Customizations Yet</Text>
          <Text style={{ textAlign: 'center', color: '#6B7280', marginBottom: 24 }}>Add groups like "Size", "Crust Type", or "Extra Toppings" to give your customers choices.</Text>
          <TouchableOpacity onPress={openAddGroup} style={{ backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Create First Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {groups.map((group) => (
            <View key={group._id} style={{ backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
              {/* Group Header */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginRight: 8, flexShrink: 1 }} numberOfLines={2}>{group.name}</Text>
                    {group.isRequired && (
                      <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 }}>
                        <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '700' }}>REQUIRED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {group.selectionType === 'multiple' ? `Select ${group.minSelections} to ${group.maxSelections} options` : 'Select 1 option'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => openEditGroup(group)} style={{ padding: 8 }}><Icon name="pencil" size={18} color="#6B7280" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGroup(group)} style={{ padding: 8 }}><Icon name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
                </View>
              </View>

              {/* Options List */}
              <View style={{ padding: 16 }}>
                {group.options && group.options.length > 0 ? (
                  group.options.map((option) => (
                    <View key={option._id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }} numberOfLines={2}>{option.name}</Text>
                        {option.description ? <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={2}>{option.description}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981', marginRight: 12 }}>
                          {option.additionalPrice > 0 ? `+£${option.additionalPrice.toFixed(2)}` : 'Free'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => openEditOption(group._id, option)} style={{ padding: 6, marginRight: 2 }}><Icon name="pencil" size={18} color="#6B7280" /></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteOption(option)} style={{ padding: 6 }}><Icon name="close-circle-outline" size={20} color="#EF4444" /></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="warning-outline" size={20} color="#D97706" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>No options added yet</Text>
                      <Text style={{ color: '#B45309', fontSize: 12 }}>Customers won't see this group until you add at least one option below.</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity onPress={() => openAddOption(group._id)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#EEF2FF', borderRadius: 8 }}>
                  <Icon name="add-circle-outline" size={20} color="#6366F1" />
                  <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Add Option</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ─── Group Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={groupModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGroupModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ padding: 20, paddingTop: Math.max(insets.top, 20) + 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' }}>
            <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={{ marginRight: 16, padding: 4 }}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{editingGroup ? 'Edit Group' : 'New Group'}</Text>
            <TouchableOpacity onPress={handleSaveGroup} disabled={saving} style={{ backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Group Name *</Text>
            <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 15 }} placeholder="e.g. Size, Crust, Extras" value={groupForm.name} onChangeText={(t) => setGroupForm({ ...groupForm, name: t })} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }}>Required Choice</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Customer must select an option</Text>
              </View>
              <Switch value={groupForm.isRequired} onValueChange={(v) => setGroupForm({ ...groupForm, isRequired: v })} trackColor={{ false: '#D1D5DB', true: '#818CF8' }} thumbColor={groupForm.isRequired ? '#4F46E5' : '#FFF'} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 }}>Multiple Selections</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Allow choosing more than one</Text>
              </View>
              <Switch value={groupForm.selectionType === 'multiple'} onValueChange={(v) => setGroupForm({ ...groupForm, selectionType: v ? 'multiple' : 'single' })} trackColor={{ false: '#D1D5DB', true: '#818CF8' }} thumbColor={groupForm.selectionType === 'multiple' ? '#4F46E5' : '#FFF'} />
            </View>

            {groupForm.selectionType === 'multiple' && (
              <View style={{ flexDirection: 'row', marginBottom: 20, justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Min Selections</Text>
                  <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 15 }} keyboardType="number-pad" value={groupForm.minSelections.toString()} onChangeText={(t) => setGroupForm({ ...groupForm, minSelections: parseInt(t) || 0 })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Max Selections</Text>
                  <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, fontSize: 15 }} keyboardType="number-pad" value={groupForm.maxSelections.toString()} onChangeText={(t) => setGroupForm({ ...groupForm, maxSelections: parseInt(t) || 1 })} />
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Option Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={optionModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOptionModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ padding: 20, paddingTop: Math.max(insets.top, 20) + 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' }}>
            <TouchableOpacity onPress={() => setOptionModalVisible(false)} style={{ marginRight: 16, padding: 4 }}><Icon name="close" size={24} color="#374151" /></TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={1}>{editingOption ? 'Edit Option' : 'New Option'}</Text>
            <TouchableOpacity onPress={handleSaveOption} disabled={saving} style={{ backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Option Name *</Text>
            <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 15 }} placeholder="e.g. Large, Extra Cheese" value={optionForm.name} onChangeText={(t) => setOptionForm({ ...optionForm, name: t })} />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Additional Price (£)</Text>
            <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 15 }} placeholder="0.00" keyboardType="decimal-pad" value={optionForm.additionalPrice} onChangeText={(t) => setOptionForm({ ...optionForm, additionalPrice: t })} />

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Description (Optional)</Text>
            <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 14, marginBottom: 20, height: 100, textAlignVertical: 'top', fontSize: 15 }} placeholder="e.g. Adds 200 calories" multiline value={optionForm.description} onChangeText={(t) => setOptionForm({ ...optionForm, description: t })} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
