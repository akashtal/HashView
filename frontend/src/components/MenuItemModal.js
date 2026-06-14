import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';
import ToastService from '../utils/ToastService';
import COLORS from '../config/colors';

export default function MenuItemModal({ visible, onClose, item, business }) {
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [selectedAddOns, setSelectedAddOns] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (visible && item) {
      setQuantity(1);
      
      // Initialize required modifiers with their default options
      const initialModifiers = {};
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
          if (mod.isRequired && mod.options && mod.options.length > 0) {
            initialModifiers[mod.name] = mod.options[0];
          }
        });
      }
      setSelectedModifiers(initialModifiers);
      setSelectedAddOns({});
      calculateTotal(1, initialModifiers, {});
    }
  }, [visible, item]);

  const calculateTotal = (qty, mods, addons) => {
    if (!item) return;
    let basePrice = item.price;

    // Add modifier prices
    Object.values(mods).forEach(opt => {
      if (opt && opt.price > 0) basePrice += opt.price;
    });

    // Add addon prices
    Object.values(addons).forEach(addon => {
      if (addon && addon.price > 0) basePrice += addon.price;
    });

    setTotalPrice(basePrice * qty);
  };

  const handleQuantityChange = (delta) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
    calculateTotal(newQty, selectedModifiers, selectedAddOns);
  };

  const handleModifierSelect = (modName, option) => {
    const newMods = { ...selectedModifiers, [modName]: option };
    setSelectedModifiers(newMods);
    calculateTotal(quantity, newMods, selectedAddOns);
  };

  const handleAddOnToggle = (addon) => {
    const newAddOns = { ...selectedAddOns };
    if (newAddOns[addon.name]) {
      delete newAddOns[addon.name];
    } else {
      newAddOns[addon.name] = addon;
    }
    setSelectedAddOns(newAddOns);
    calculateTotal(quantity, selectedModifiers, newAddOns);
  };

  const handleAddToCart = () => {
    // Validate required modifiers
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        if (mod.isRequired && !selectedModifiers[mod.name]) {
          ToastService.showError('Required', `Please select an option for ${mod.name}`);
          return;
        }
      }
    }

    const cartItem = {
      cartItemId: Date.now().toString(), // Unique ID for this cart entry
      menuItem: item,
      quantity,
      selectedModifiers: Object.values(selectedModifiers),
      selectedAddOns: Object.values(selectedAddOns),
      itemTotal: totalPrice / quantity, // Price for one unit including selected options
    };

    dispatch(addItem({
      businessId: business._id,
      businessName: business.name,
      item: cartItem
    }));

    ToastService.showSuccess('Added to Cart', `${item.name} added successfully.`);
    onClose();
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }}>
          
          {/* Header Image */}
          {item.image?.url ? (
            <View style={{ position: 'relative', height: 200 }}>
              <Image source={{ uri: item.image.url }} style={{ width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }} resizeMode="cover" />
              <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 }}>
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 16, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#F3F4F6', borderRadius: 20, padding: 6 }}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {/* Item Info */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', flex: 1, paddingRight: 10 }}>{item.name}</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.secondary }}>
                  {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{item.price.toFixed(2)}
                </Text>
              </View>
              {item.description ? (
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 20 }}>{item.description}</Text>
              ) : null}
            </View>

            {/* Modifiers */}
            {item.modifiers && item.modifiers.map((mod, index) => (
              <View key={index} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>{mod.name}</Text>
                  {mod.isRequired && <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>Required</Text>}
                </View>
                {mod.options && mod.options.map((opt, optIndex) => {
                  const isSelected = selectedModifiers[mod.name]?.name === opt.name;
                  return (
                    <TouchableOpacity
                      key={optIndex}
                      onPress={() => handleModifierSelect(mod.name, opt)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: isSelected ? COLORS.secondary : '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                          {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary }} />}
                        </View>
                        <Text style={{ fontSize: 15, color: '#111827' }}>{opt.name}</Text>
                      </View>
                      {opt.price > 0 && <Text style={{ fontSize: 14, color: '#6B7280' }}>+{item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{opt.price.toFixed(2)}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Add-Ons */}
            {item.addOns && item.addOns.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 10 }}>Optional Extras</Text>
                {item.addOns.map((addon, index) => {
                  const isSelected = !!selectedAddOns[addon.name];
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleAddOnToggle(addon)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? COLORS.secondary : '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: isSelected ? COLORS.secondary : 'transparent' }}>
                          {isSelected && <Icon name="checkmark" size={14} color="#FFF" />}
                        </View>
                        <Text style={{ fontSize: 15, color: '#111827' }}>{addon.name}</Text>
                      </View>
                      {addon.price > 0 && <Text style={{ fontSize: 14, color: '#6B7280' }}>+{item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{addon.price.toFixed(2)}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Quantity Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 }}>
              <TouchableOpacity onPress={() => handleQuantityChange(-1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="remove" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginHorizontal: 24, color: '#111827' }}>{quantity}</Text>
              <TouchableOpacity onPress={() => handleQuantityChange(1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="add" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

          </ScrollView>

          {/* Add to Cart Footer */}
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFF' }}>
            <TouchableOpacity
              onPress={handleAddToCart}
              style={{ backgroundColor: COLORS.secondary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Add {quantity} to Cart</Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{totalPrice.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
