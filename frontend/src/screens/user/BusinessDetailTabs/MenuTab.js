import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

const PREDEFINED_ORDER = [
  'starter',
  'appetizer',
  'soup',
  'chinese',
  'curry',
  'main',
  'pizza',
  'burger',
  'side',
  'dessert',
  'sweet',
  'drink',
  'beverage'
];

const MenuTab = ({
  loadingMenu,
  menuItems,
  handleMenuItemPress,
  handleImagePress,
  getItemQuantity,
  handleDirectRemove,
  handleDirectAdd,
  categoryOrder = [],
}) => {
  const getWeight = (cat) => {
    // 1. Check dynamic DB order first
    if (categoryOrder && categoryOrder.length > 0) {
      const idx = categoryOrder.indexOf(cat);
      if (idx !== -1) return idx;
      return 999;
    }
    
    // 2. Fallback to hardcoded predefined order for old menus
    const catLower = cat.toLowerCase();
    for (let i = 0; i < PREDEFINED_ORDER.length; i++) {
      if (catLower.includes(PREDEFINED_ORDER[i])) return i;
    }
    
    // 3. Alphabetical fallback
    return 999;
  };

  return (
    <View>
      {loadingMenu ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading menu...</Text>
        </View>
      ) : Object.keys(menuItems).length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="restaurant-outline" size={32} color="#6366F1" />
          </View>
          <Text
            style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 }}
          >
            No menu available
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: '#9CA3AF',
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            This business hasn't added their menu or services yet.
          </Text>
        </View>
      ) : (
        Object.entries(menuItems)
          .sort(([catA], [catB]) => {
            const weightA = getWeight(catA);
            const weightB = getWeight(catB);
            if (weightA !== weightB) return weightA - weightB;
            return catA.localeCompare(catB);
          })
          .map(([category, items]) => (
          <View key={category} style={{ marginBottom: 24 }}>
            {/* Category heading */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#374151',
                marginBottom: 10,
                borderLeftWidth: 3,
                borderLeftColor: '#6366F1',
                paddingLeft: 10,
              }}
            >
              {category}
            </Text>
            {items.map((item) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => (item.isAvailable ? handleMenuItemPress(item) : null)}
                key={item._id}
                style={{
                  backgroundColor: '#FFF',
                  borderRadius: 14,
                  marginBottom: 10,
                  flexDirection: 'row',
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                  opacity: item.isAvailable ? 1 : 0.5,
                }}
              >
                {/* Image */}
                {item.image?.url ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleImagePress(item.image.url)}
                  >
                    <Image
                      source={{ uri: item.image.url }}
                      style={{ width: 76, height: 76 }}
                      resizeMode="cover"
                    />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 4,
                        padding: 2,
                      }}
                    >
                      <Icon name="expand-outline" size={10} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      width: 76,
                      height: 76,
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="image-outline" size={22} color="#D1D5DB" />
                  </View>
                )}
                {/* Info */}
                <View style={{ flex: 1, padding: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 14,
                        color: '#111827',
                        flex: 1,
                        marginRight: 8,
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                      {item.isPopular && <Text style={{ color: '#F59E0B' }}> ⭐</Text>}
                    </Text>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#6366F1' }}>
                      £{item.price.toFixed(2)}
                    </Text>
                  </View>
                  {item.description ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#6B7280',
                        marginTop: 3,
                        lineHeight: 17,
                      }}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginTop: 4,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      {/* Duration for services */}
                      {item.duration ? (
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                          ⏱ {item.duration} min
                        </Text>
                      ) : null}
                      {/* Dietary badges */}
                      {item.dietary?.length > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          {item.dietary.slice(0, 3).map((d) => (
                            <View
                              key={d}
                              style={{
                                backgroundColor: '#DCFCE7',
                                borderRadius: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '600',
                                  color: '#166534',
                                }}
                              >
                                {d}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {!item.isAvailable && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#EF4444',
                            marginTop: 4,
                            fontWeight: '600',
                          }}
                        >
                          Currently unavailable
                        </Text>
                      )}
                    </View>

                    {/* Add/Remove Buttons */}
                    {item.isAvailable && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#F3F4F6',
                          borderRadius: 20,
                          padding: 2,
                        }}
                      >
                        {getItemQuantity(item._id) > 0 ? (
                          <>
                            <TouchableOpacity
                              onPress={() => handleDirectRemove(item)}
                              style={{
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#FFF',
                                borderRadius: 14,
                                shadowColor: '#000',
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                shadowOffset: { width: 0, height: 1 },
                                elevation: 1,
                              }}
                            >
                              <Icon name="remove" size={16} color="#4B5563" />
                            </TouchableOpacity>
                            <Text
                              style={{
                                paddingHorizontal: 10,
                                fontWeight: '700',
                                color: '#111827',
                                fontSize: 13,
                              }}
                            >
                              {getItemQuantity(item._id)}
                            </Text>
                          </>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => handleDirectAdd(item)}
                          style={{
                            width: 28,
                            height: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#6C47FF',
                            borderRadius: 14,
                            shadowColor: '#6C47FF',
                            shadowOpacity: 0.3,
                            shadowRadius: 3,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                          }}
                        >
                          <Icon name="add" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </View>
  );
};

export default MenuTab;
