import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import ApiService from '../../services/api.service';
import colors from '../../config/colors';
import { Picker } from '@react-native-picker/picker';

const TaxManagementScreen = ({ navigation, route }) => {
  const { businessId } = route.params;
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTax, setEditingTax] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState('percentage');
  const [mode, setMode] = useState('exclusive');
  const [appliesTo, setAppliesTo] = useState('entire_order');

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getTaxRules(businessId);
      setTaxes(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load tax rules');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (tax = null) => {
    if (tax) {
      setEditingTax(tax);
      setName(tax.name);
      setRate(tax.rate.toString());
      setType(tax.type);
      setMode(tax.calculationMode || 'exclusive');
      setAppliesTo(tax.applicability || 'entire_order');
    } else {
      setEditingTax(null);
      setName('');
      setRate('');
      setType('percentage');
      setMode('exclusive');
      setAppliesTo('entire_order');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !rate) {
      return Alert.alert('Error', 'Please fill all fields');
    }

    try {
      const payload = {
        businessId: businessId,
        name,
        rate: Number(rate),
        type,
        mode,
        appliesTo,
      };

      if (editingTax) {
        await ApiService.updateTaxRule(editingTax._id, payload);
      } else {
        await ApiService.createTaxRule(payload);
      }
      setModalVisible(false);
      loadTaxes();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save tax rule');
    }
  };

  const handleToggle = async (id) => {
    try {
      // Optimistic update
      setTaxes((prev) => prev.map((t) => (t._id === id ? { ...t, isActive: !t.isActive } : t)));
      await ApiService.toggleTaxRule(id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to toggle tax rule');
      loadTaxes(); // revert
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Tax', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteTaxRule(id);
            loadTaxes();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderTaxItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>
            {item.type === 'percentage' ? `${item.rate}%` : `$${item.rate}`} •{' '}
            {item.calculationMode || 'exclusive'} •{' '}
            {item.applicability?.replace('_', ' ') || 'entire order'}
          </Text>
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
        <Text style={styles.title}>Tax Management</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={taxes}
          keyExtractor={(item) => item._id}
          renderItem={renderTaxItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No tax rules configured.</Text>}
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.modalTitle}>{editingTax ? 'Edit Tax' : 'New Tax'}</Text>

              <Text style={styles.label}>Tax Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GST, VAT"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Rate</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={rate}
                onChangeText={setRate}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={type} onValueChange={setType}>
                      <Picker.Item label="Percentage (%)" value="percentage" />
                      <Picker.Item label="Fixed Amount" value="fixed" />
                    </Picker>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Mode</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={mode} onValueChange={setMode}>
                      <Picker.Item label="Exclusive" value="exclusive" />
                      <Picker.Item label="Inclusive" value="inclusive" />
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Applies To</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={appliesTo} onValueChange={setAppliesTo}>
                  <Picker.Item label="Entire Order" value="entire_order" />
                  <Picker.Item label="Specific Category" value="category" />
                  <Picker.Item label="Specific Item" value="item" />
                </Picker>
              </View>

              {/* Preview Section */}
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Preview (on $100 item)</Text>
                <Text style={styles.previewText}>
                  {type === 'percentage'
                    ? mode === 'exclusive'
                      ? `Adds $${((100 * (Number(rate) || 0)) / 100).toFixed(2)} to bill`
                      : `Includes $${(100 - 100 / (1 + (Number(rate) || 0) / 100)).toFixed(2)} in price`
                    : mode === 'exclusive'
                      ? `Adds $${Number(rate) || 0} to bill`
                      : `Includes $${Number(rate) || 0} in price`}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => setModalVisible(false)}
                >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#666' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { marginLeft: 6, fontSize: 14, color: colors.primary, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },
  previewBox: {
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  previewTitle: { fontSize: 12, fontWeight: 'bold', color: '#4f46e5', marginBottom: 4 },
  previewText: { fontSize: 14, color: '#3730a3' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, gap: 12 },
  modalBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalBtnCancelText: { color: '#444', fontWeight: 'bold', fontSize: 16 },
  modalBtnSave: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalBtnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default TaxManagementScreen;
