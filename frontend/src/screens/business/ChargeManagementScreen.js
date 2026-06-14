import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import colors from '../../config/colors';
import { Picker } from '@react-native-picker/picker';

const ChargeManagementScreen = ({ navigation, route }) => {
  const { businessId } = route.params;
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState('percentage');
  const [isConditional, setIsConditional] = useState(false);
  const [conditionType, setConditionType] = useState('none');
  const [conditionValue, setConditionValue] = useState('');

  useEffect(() => {
    loadCharges();
  }, []);

  const loadCharges = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getChargeRules(businessId);
      setCharges(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load charge rules');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (charge = null) => {
    if (charge) {
      setEditingCharge(charge);
      setName(charge.name);
      setRate(charge.rate.toString());
      setType(charge.type);
      setIsConditional(charge.isConditional);
      setConditionType(charge.conditionType || 'none');
      setConditionValue(charge.conditionValue ? charge.conditionValue.toString() : '');
    } else {
      setEditingCharge(null);
      setName('');
      setRate('');
      setType('percentage');
      setIsConditional(false);
      setConditionType('none');
      setConditionValue('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !rate) {
      return Alert.alert('Error', 'Please fill name and rate');
    }
    if (isConditional && conditionType !== 'none' && !conditionValue) {
      return Alert.alert('Error', 'Please fill the condition value');
    }

    try {
      const payload = {
        businessId: businessId,
        name,
        rate: Number(rate),
        type,
        isConditional,
        conditionType: isConditional ? conditionType : 'none',
        conditionValue: isConditional && conditionValue ? Number(conditionValue) : null
      };

      if (editingCharge) {
        await ApiService.updateChargeRule(editingCharge._id, payload);
      } else {
        await ApiService.createChargeRule(payload);
      }
      setModalVisible(false);
      loadCharges();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save charge rule');
    }
  };

  const handleToggle = async (id) => {
    try {
      setCharges(prev => prev.map(c => c._id === id ? { ...c, isActive: !c.isActive } : c));
      await ApiService.toggleChargeRule(id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to toggle charge rule');
      loadCharges();
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Charge', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await ApiService.deleteChargeRule(id);
          loadCharges();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  const renderChargeItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>
            {item.type === 'percentage' ? `${item.rate}%` : `$${item.rate}`} 
          </Text>
          {item.isConditional && item.conditionType !== 'none' && (
            <Text style={styles.conditionBadge}>
              Condition: {item.conditionType} {item.conditionType === 'order_value' ? '<' : '<'} {item.conditionValue}
            </Text>
          )}
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggle(item._id)}
          trackColor={{ false: '#767577', true: colors.primary }}
        />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openForm(item)}>
          <Icon name="pencil" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item._id)}>
          <Icon name="trash" size={20} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Charge Management</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={charges}
          keyExtractor={item => item._id}
          renderItem={renderChargeItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No charge rules configured.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openForm()}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>{editingCharge ? 'Edit Charge' : 'New Charge'}</Text>
              
              <Text style={styles.label}>Charge Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Service Charge, Delivery Fee"
                value={name}
                onChangeText={setName}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Rate/Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                    value={rate}
                    onChangeText={setRate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={type} onValueChange={setType}>
                      <Picker.Item label="%" value="percentage" />
                      <Picker.Item label="Flat" value="fixed" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Is Conditional?</Text>
                <Switch value={isConditional} onValueChange={setIsConditional} trackColor={{ true: colors.primary }} />
              </View>

              {isConditional && (
                <View style={styles.conditionBox}>
                  <Text style={styles.label}>Condition Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={conditionType} onValueChange={setConditionType}>
                      <Picker.Item label="Order Value (Applies if < X)" value="order_value" />
                      <Picker.Item label="Guest Count (Applies if < X)" value="guest_count" />
                      <Picker.Item label="Time of Day (Applies after X hrs)" value="time_of_day" />
                    </Picker>
                  </View>

                  <Text style={styles.label}>Condition Value (X)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={conditionType === 'time_of_day' ? 'e.g. 22 (for 10 PM)' : 'e.g. 50'}
                    keyboardType="numeric"
                    value={conditionValue}
                    onChangeText={setConditionValue}
                  />
                </View>
              )}

              {/* Preview Section */}
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Preview (on $100 order)</Text>
                <Text style={styles.previewText}>
                  {type === 'percentage' 
                    ? `Adds $${(100 * (Number(rate) || 0) / 100).toFixed(2)} to bill`
                    : `Adds $${Number(rate) || 0} to bill`}
                  {isConditional ? ' (if condition met)' : ''}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSave} onPress={handleSave}>
                  <Text style={styles.modalBtnSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#666' },
  conditionBadge: { marginTop: 6, fontSize: 12, color: '#e67e22', backgroundColor: '#fdf2e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', overflow: 'hidden' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { marginLeft: 6, fontSize: 14, color: colors.primary, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', overflow: 'hidden', height: 50, justifyContent: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  conditionBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#eee' },
  previewBox: { backgroundColor: '#eef2ff', padding: 12, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: '#c7d2fe' },
  previewTitle: { fontSize: 12, fontWeight: 'bold', color: '#4f46e5', marginBottom: 4 },
  previewText: { fontSize: 14, color: '#3730a3' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, gap: 12 },
  modalBtnCancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#f0f0f0' },
  modalBtnCancelText: { color: '#444', fontWeight: 'bold', fontSize: 16 },
  modalBtnSave: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.primary },
  modalBtnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default ChargeManagementScreen;
