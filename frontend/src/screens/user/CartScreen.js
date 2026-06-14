import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { updateQuantity, removeItem, clearCart } from '../../store/slices/cartSlice';
import COLORS from '../../config/colors';

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);

  const handleUpdateQuantity = (cartItemId, currentQuantity, delta) => {
    const newQuantity = currentQuantity + delta;
    dispatch(updateQuantity({ cartItemId, quantity: newQuantity }));
  };

  const handleRemoveItem = (cartItemId) => {
    dispatch(removeItem({ cartItemId }));
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" />
        <View className="flex-row items-center px-5 py-4 pt-12 bg-white shadow-sm z-10">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Icon name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 ml-4">My Cart</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-6">
            <Icon name="cart-outline" size={48} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</Text>
          <Text className="text-gray-500 text-center mb-8">
            Looks like you haven't added anything to your cart yet.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-full bg-[#6C47FF] py-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-base">Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get currency from the first item (assuming all items in cart have same currency)
  const currencySymbol = cart.items[0]?.menuItem?.currency === 'GBP' ? '£' : cart.items[0]?.menuItem?.currency === 'USD' ? '$' : '€';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 pt-12 bg-white shadow-sm z-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Icon name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <View className="ml-4">
            <Text className="text-lg font-bold text-gray-900">My Cart</Text>
            <Text className="text-xs text-gray-500">{cart.businessName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => dispatch(clearCart())}>
          <Text className="text-red-500 font-semibold text-sm">Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {cart.items.map((cartItem) => (
          <View key={cartItem.cartItemId} className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100">
            <View className="flex-row mb-3">
              {cartItem.menuItem.image?.url ? (
                <Image 
                  source={{ uri: cartItem.menuItem.image.url }} 
                  className="w-16 h-16 rounded-xl mr-3" 
                  resizeMode="cover" 
                />
              ) : (
                <View className="w-16 h-16 rounded-xl bg-gray-100 items-center justify-center mr-3">
                  <Icon name="restaurant-outline" size={24} color="#9CA3AF" />
                </View>
              )}
              
              <View className="flex-1 justify-center">
                <View className="flex-row justify-between items-start">
                  <Text className="font-bold text-gray-900 text-base flex-1 pr-2" numberOfLines={2}>
                    {cartItem.menuItem.name}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(cartItem.cartItemId)} className="p-1">
                    <Icon name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="font-bold text-[#6C47FF] mt-1">
                  {currencySymbol}{cartItem.itemTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Modifiers & Add-ons */}
            {(cartItem.selectedModifiers?.length > 0 || cartItem.selectedAddOns?.length > 0) && (
              <View className="bg-gray-50 p-3 rounded-xl mb-3">
                {cartItem.selectedModifiers?.map((mod, i) => (
                  <View key={`mod-${i}`} className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-gray-600 font-medium flex-1">• {mod.name}</Text>
                    {mod.price > 0 && <Text className="text-xs text-gray-500">+{currencySymbol}{mod.price.toFixed(2)}</Text>}
                  </View>
                ))}
                {cartItem.selectedAddOns?.map((addon, i) => (
                  <View key={`addon-${i}`} className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-gray-600 font-medium flex-1">+ {addon.name}</Text>
                    {addon.price > 0 && <Text className="text-xs text-gray-500">+{currencySymbol}{addon.price.toFixed(2)}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Quantity Controls & Item Total */}
            <View className="flex-row justify-between items-center mt-1">
              <View className="flex-row items-center bg-gray-100 rounded-lg">
                <TouchableOpacity 
                  onPress={() => handleUpdateQuantity(cartItem.cartItemId, cartItem.quantity, -1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Icon name="remove" size={18} color="#374151" />
                </TouchableOpacity>
                <Text className="font-bold text-gray-900 mx-2 w-6 text-center">{cartItem.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => handleUpdateQuantity(cartItem.cartItemId, cartItem.quantity, 1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Icon name="add" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
              <Text className="font-bold text-gray-900 text-base">
                {currencySymbol}{(cartItem.itemTotal * cartItem.quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View className="bg-white p-5 rounded-2xl mb-8 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-900 text-lg mb-4">Order Summary</Text>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="font-semibold text-gray-900">{currencySymbol}{cart.cartTotal.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-600">Taxes & Fees</Text>
            <Text className="font-semibold text-gray-500 text-xs">Calculated at checkout</Text>
          </View>
          
          <View className="h-[1px] w-full bg-gray-100 mb-4" />
          
          <View className="flex-row justify-between items-center">
            <Text className="font-bold text-gray-900 text-base">Estimated Total</Text>
            <Text className="font-bold text-[#6C47FF] text-xl">{currencySymbol}{cart.cartTotal.toFixed(2)}</Text>
          </View>
        </View>
        
        <View className="h-20" />
      </ScrollView>

      {/* Checkout Footer */}
      <View className="bg-white p-5 border-t border-gray-100 pb-8">
        <TouchableOpacity
          onPress={() => navigation.navigate('Checkout')}
          className="shadow-lg shadow-indigo-200"
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            className="rounded-xl py-4 items-center flex-row justify-center"
          >
            <Text className="text-white text-lg font-bold mr-2">Proceed to Checkout</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
