import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';
import ToastService from '../utils/ToastService';
import COLORS from '../config/colors';

export default function MenuItemModal({ visible, onClose, item, business }) {
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState({}); // { groupId: [optionId, ...] }
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (visible && item) {
      setQuantity(1);

      // Initialize default selections
      const initialSelections = {};
      if (item.customizationGroups && item.customizationGroups.length > 0) {
        item.customizationGroups.forEach((group) => {
          initialSelections[group._id] = [];
          if (group.options) {
            group.options.forEach(opt => {
              if (opt.isDefault && opt.isActive) {
                // If maxSelections is 1 and we already have a default, don't add more
                if (group.maxSelections === 1 && initialSelections[group._id].length > 0) {
                  return;
                }
                initialSelections[group._id].push(opt._id);
              }
            });
          }
        });
      }
      setSelectedCustomizations(initialSelections);
      calculateTotal(1, initialSelections);
    }
  }, [visible, item]);

  const calculateTotal = (qty, selections) => {
    if (!item) return;
    let basePrice = item.price;

    if (item.customizationGroups) {
      item.customizationGroups.forEach(group => {
        const selectedIds = selections[group._id] || [];
        group.options?.forEach(opt => {
          if (selectedIds.includes(opt._id) && opt.additionalPrice > 0) {
            basePrice += opt.additionalPrice;
          }
        });
      });
    }

    setTotalPrice(basePrice * qty);
  };

  const handleQuantityChange = (delta) => {
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
    calculateTotal(newQty, selectedCustomizations);
  };

  const handleCustomizationSelect = (group, option) => {
    const currentSelections = selectedCustomizations[group._id] || [];
    let newSelections = [...currentSelections];
    const isCurrentlySelected = newSelections.includes(option._id);

    if (group.maxSelections === 1) {
      // Radio button behavior
      newSelections = [option._id];
    } else {
      // Checkbox behavior
      if (isCurrentlySelected) {
        newSelections = newSelections.filter(id => id !== option._id);
      } else {
        if (!group.maxSelections || newSelections.length < group.maxSelections) {
          newSelections.push(option._id);
        } else {
          ToastService.showError('Maximum reached', `You can only select up to ${group.maxSelections} options for ${group.name}`);
          return;
        }
      }
    }

    const nextSelections = { ...selectedCustomizations, [group._id]: newSelections };
    setSelectedCustomizations(nextSelections);
    calculateTotal(quantity, nextSelections);
  };

  const handleAddToCart = () => {
    // Validate minSelections and isRequired
    if (item.customizationGroups) {
      for (const group of item.customizationGroups) {
        const selectedCount = (selectedCustomizations[group._id] || []).length;
        if (group.isRequired && selectedCount === 0) {
          ToastService.showError('Required', `Please select at least 1 option for ${group.name}`);
          return;
        }
        if (group.minSelections > 0 && selectedCount < group.minSelections) {
          ToastService.showError('Required', `Please select at least ${group.minSelections} options for ${group.name}`);
          return;
        }
      }
    }

    // Format selections for the cart/backend
    const customizationSelections = [];
    if (item.customizationGroups) {
      item.customizationGroups.forEach(group => {
        const selectedIds = selectedCustomizations[group._id] || [];
        group.options?.forEach(opt => {
          if (selectedIds.includes(opt._id)) {
            customizationSelections.push({
              groupId: group._id,
              groupName: group.name,
              optionId: opt._id,
              optionName: opt.name,
              priceAdjustment: opt.additionalPrice || 0
            });
          }
        });
      });
    }

    const cartItem = {
      cartItemId: Date.now().toString(), // Unique ID for this cart entry
      menuItem: item,
      quantity,
      customizationSelections,
      itemTotal: totalPrice / quantity, // Price for one unit including selected options
    };

    dispatch(
      addItem({
        businessId: business._id,
        businessName: business.name,
        item: cartItem,
      })
    );

    ToastService.showSuccess('Added to Cart', `${item.name} added successfully.`);
    onClose();
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#FFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}
        >
          {/* Header Image */}
          {item.image?.url ? (
            <View style={{ position: 'relative', height: 200 }}>
              <Image
                source={{ uri: item.image.url }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={onClose}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 6,
                }}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 16, alignItems: 'flex-end' }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: '#F3F4F6', borderRadius: 20, padding: 6 }}
              >
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {/* Item Info */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#111827',
                    flex: 1,
                    paddingRight: 10,
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.secondary }}>
                  {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                  {item.price.toFixed(2)}
                </Text>
              </View>
              {item.description ? (
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 20 }}>
                  {item.description}
                </Text>
              ) : null}
            </View>

            {/* Customizations */}
            {item.customizationGroups && item.customizationGroups.map((group, index) => (
                <View key={index} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>
                        {group.name}
                      </Text>
                      {group.minSelections > 0 && group.maxSelections > 0 && (
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                          Select {group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections} to ${group.maxSelections}`}
                        </Text>
                      )}
                    </View>
                    {group.isRequired && (
                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        Required
                      </Text>
                    )}
                  </View>
                  {group.options && group.options.filter(o => o.isActive).map((opt, optIndex) => {
                    const isSelected = (selectedCustomizations[group._id] || []).includes(opt._id);
                    const isRadio = group.maxSelections === 1;

                    return (
                      <TouchableOpacity
                        key={optIndex}
                        onPress={() => handleCustomizationSelect(group, opt)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#F3F4F6',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: isRadio ? 10 : 4,
                              borderWidth: 2,
                              borderColor: isSelected ? COLORS.secondary : '#D1D5DB',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                              backgroundColor: (isSelected && !isRadio) ? COLORS.secondary : 'transparent',
                            }}
                          >
                            {isSelected && isRadio && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.secondary }} />
                            )}
                            {isSelected && !isRadio && (
                              <Icon name="checkmark" size={14} color="#FFF" />
                            )}
                          </View>
                          <Text style={{ fontSize: 15, color: '#111827' }}>{opt.name}</Text>
                        </View>
                        {opt.additionalPrice > 0 && (
                          <Text style={{ fontSize: 14, color: '#6B7280' }}>
                            +{item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                            {opt.additionalPrice.toFixed(2)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

            {/* Quantity Selector */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => handleQuantityChange(-1)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="remove" size={24} color="#374151" />
              </TouchableOpacity>
              <Text
                style={{ fontSize: 20, fontWeight: 'bold', marginHorizontal: 24, color: '#111827' }}
              >
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => handleQuantityChange(1)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="add" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Add to Cart Footer */}
          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              backgroundColor: '#FFF',
            }}
          >
            <TouchableOpacity
              onPress={handleAddToCart}
              style={{
                backgroundColor: COLORS.secondary,
                borderRadius: 16,
                paddingVertical: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                Add {quantity} to Cart
              </Text>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                {totalPrice.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
