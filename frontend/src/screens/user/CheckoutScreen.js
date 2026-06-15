import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../../store/slices/cartSlice';
import { logout } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';
import ApiService from '../../services/api.service';

export default function CheckoutScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  
  const userLocation = route.params?.userLocation || null;
  const isGuest = !user || user.isGuest || user.role === 'guest';
  
  const [dinerName, setDinerName] = useState(user?.name || '');
  const [tableNumber, setTableNumber] = useState('');
  const [peopleCount, setPeopleCount] = useState('1');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingRules, setBillingRules] = useState({ taxes: [], charges: [] });
  const [billBreakdown, setBillBreakdown] = useState({
    subtotal: 0,
    taxes: [],
    charges: [],
    totalTaxAmount: 0,
    totalChargeAmount: 0,
    grandTotal: 0
  });

  // Get currency from the first item
  const currencySymbol = cart.items[0]?.menuItem?.currency === 'GBP' ? '£' : cart.items[0]?.menuItem?.currency === 'USD' ? '$' : '€';

  // Guard: redirect guest users to login immediately
  useEffect(() => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to place an order.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: 'Login Now',
            style: 'default',
            onPress: () => dispatch(logout())
          }
        ]
      );
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      if (cart.businessId) {
        fetchBillingRules(cart.businessId);
      }
    }, [cart.businessId])
  );

  useEffect(() => {
    calculateBillBreakdown();
  }, [cart.items, cart.cartTotal, billingRules]);

  const fetchBillingRules = async (businessId) => {
    try {
      console.log('Fetching billing rules for business:', businessId);
      const activeRules = await ApiService.getActiveBillingRules(businessId);
      console.log('Received billing rules:', JSON.stringify(activeRules));
      setBillingRules({ taxes: activeRules?.taxes || [], charges: activeRules?.charges || [] });
    } catch (error) {
      console.log('Error fetching billing rules:', error?.response?.data || error.message);
    }
  };

  const calculateBillBreakdown = () => {
    const subtotal = cart.cartTotal;
    let calculatedTaxes = [];
    let calculatedCharges = [];
    let totalTaxAmount = 0;
    let totalChargeAmount = 0;

    billingRules.taxes.forEach(tax => {
      let amount = tax.type === 'percentage' ? subtotal * (tax.rate / 100) : tax.rate;
      if (amount > 0) {
        calculatedTaxes.push({ ...tax, amount });
        totalTaxAmount += amount;
      }
    });

    billingRules.charges.forEach(charge => {
      let amount = charge.type === 'percentage' ? subtotal * (charge.rate / 100) : charge.rate;
      if (amount > 0) {
        calculatedCharges.push({ ...charge, amount });
        totalChargeAmount += amount;
      }
    });

    setBillBreakdown({
      subtotal,
      taxes: calculatedTaxes,
      charges: calculatedCharges,
      totalTaxAmount,
      totalChargeAmount,
      grandTotal: subtotal + totalTaxAmount + totalChargeAmount
    });
  };

  const handlePlaceOrder = async () => {
    if (!dinerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name for the order.');
      return;
    }
    if (!tableNumber.trim()) {
      Alert.alert('Table Number Required', 'Please enter your table number so we know where to serve your order.');
      return;
    }

    setLoading(true);
    const orderPayload = {
      businessId: cart.businessId,
      items: cart.items,
      customerName: dinerName,
      tableNumber,
      numberOfPeople: Number(peopleCount) || 1,
      specialInstructions,
      userLocation
    };

    try {
      const response = await ApiService.createOrder(orderPayload);
      
      if (response.success || response.data?.success) {
        Alert.alert(
          'Order Placed Successfully!',
          'Your order has been sent to the kitchen. You can track its status in the Orders tab.',
          [
            {
              text: 'OK',
              onPress: () => {
                dispatch(clearCart());
                navigation.navigate('Home'); // Redirect to Home or Order Tracking
              }
            }
          ]
        );
      } else {
        Alert.alert('Order Failed', response.message || response.data?.message || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.log('Order submission error:', error);
      Alert.alert('Error', 'An error occurred while placing your order. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Your cart is empty.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 p-2 bg-gray-200 rounded">
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 pt-12 bg-white shadow-sm z-10 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
          <Icon name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-4">Checkout</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Restaurant Info */}
        <View className="bg-white px-5 py-4 mb-3">
          <Text className="text-sm font-bold text-gray-500 mb-1">ORDERING FROM</Text>
          <Text className="text-xl font-bold text-gray-900">{cart.businessName}</Text>
          <View className="flex-row items-center mt-2 bg-blue-50 self-start px-3 py-1.5 rounded-lg border border-blue-100">
            <Icon name="restaurant" size={14} color="#3B82F6" />
            <Text className="text-blue-700 font-semibold text-xs ml-1.5">Table Service Only</Text>
          </View>
        </View>

        {/* Dine-In Details */}
        <View className="bg-white px-5 py-5 mb-3">
          <Text className="text-base font-bold text-gray-900 mb-4 flex-row items-center">
            <Icon name="person" size={18} color={COLORS.secondary} /> Diner Details
          </Text>
          
          <Text className="text-sm font-semibold text-gray-700 mb-2">Your Name <Text className="text-red-500">*</Text></Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-5 text-base font-bold"
            placeholder="e.g. John Doe"
            value={dinerName}
            onChangeText={setDinerName}
            placeholderTextColor="#9CA3AF"
          />

          <View className="flex-row justify-between mb-5">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Table Number <Text className="text-red-500">*</Text></Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-bold"
                placeholder="e.g. 12"
                value={tableNumber}
                onChangeText={setTableNumber}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Number of People</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-bold"
                placeholder="e.g. 2"
                value={peopleCount}
                onChangeText={setPeopleCount}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <Text className="text-sm font-semibold text-gray-700 mb-2">Special Instructions</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base"
            placeholder="e.g. No allergies, make it spicy..."
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary / Bill Breakdown */}
        <View className="bg-white px-5 py-5 mb-3">
          <Text className="text-base font-bold text-gray-900 mb-4">Order Items</Text>
          {cart.items.map((cartItem) => (
            <View key={cartItem.cartItemId} className="flex-row justify-between mb-3 pb-3 border-b border-gray-50">
              <View className="flex-row flex-1 pr-3">
                <Text className="font-bold text-gray-900 mr-2">{cartItem.quantity}x</Text>
                <View>
                  <Text className="font-semibold text-gray-800">{cartItem.menuItem.name}</Text>
                  {(cartItem.selectedModifiers?.length > 0 || cartItem.selectedAddOns?.length > 0) && (
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {cartItem.selectedModifiers.map(m => m.name).concat(cartItem.selectedAddOns.map(a => a.name)).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
              <Text className="font-semibold text-gray-900">
                {currencySymbol}{(cartItem.itemTotal * cartItem.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          
          <View className="mt-2 pt-2 border-t border-gray-100">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 font-medium">Subtotal</Text>
              <Text className="text-gray-900 font-semibold">{currencySymbol}{billBreakdown.subtotal.toFixed(2)}</Text>
            </View>
            
            {billBreakdown.taxes.map((tax, i) => (
              <View key={`tax-${i}`} className="flex-row justify-between mb-1.5">
                <Text className="text-gray-500 text-sm">{tax.name} ({tax.type === 'percentage' ? `${tax.rate}%` : 'Fixed'})</Text>
                <Text className="text-gray-600 text-sm">+{currencySymbol}{tax.amount.toFixed(2)}</Text>
              </View>
            ))}
            
            {billBreakdown.charges.map((charge, i) => (
              <View key={`charge-${i}`} className="flex-row justify-between mb-1.5">
                <Text className="text-gray-500 text-sm">{charge.name} ({charge.type === 'percentage' ? `${charge.rate}%` : 'Fixed'})</Text>
                <Text className="text-gray-600 text-sm">+{currencySymbol}{charge.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Warning */}
        <View className="bg-yellow-50 px-5 py-4 mb-6 border-y border-yellow-100 flex-row">
          <Icon name="information-circle" size={24} color="#D97706" />
          <View className="ml-3 flex-1">
            <Text className="text-yellow-800 font-bold mb-1">Pay at Cash Counter</Text>
            <Text className="text-yellow-700 text-sm">
              Payment integration is not active. Please pay at the counter after you finish your meal.
            </Text>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* Place Order Footer */}
      <View className="bg-white p-5 border-t border-gray-100 pb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-gray-900">Total to Pay Later</Text>
          <Text className="text-2xl font-black text-[#6C47FF]">{currencySymbol}{billBreakdown.grandTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={loading}
          className="shadow-lg shadow-indigo-200"
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            className="rounded-xl py-4 items-center flex-row justify-center"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text className="text-white text-lg font-bold mr-2">Confirm Order</Text>
                <Icon name="checkmark-circle" size={20} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
