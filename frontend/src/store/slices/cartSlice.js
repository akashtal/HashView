import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  businessId: null,
  businessName: null,
  items: [],
  cartTotal: 0,
};

const calculateCartTotal = (items) => {
  return items.reduce((total, item) => total + item.itemTotal * item.quantity, 0);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { businessId, businessName, item } = action.payload;

      // If cart is empty or from same business, add the item
      if (!state.businessId || state.businessId === businessId) {
        state.businessId = businessId;
        state.businessName = businessName;

        // Check if identical item (same ID, same modifiers, same addons) exists
        const existingItemIndex = state.items.findIndex(
          (i) =>
            i.menuItem._id === item.menuItem._id &&
            JSON.stringify(i.customizationSelections) === JSON.stringify(item.customizationSelections)
        );

        if (existingItemIndex >= 0) {
          state.items[existingItemIndex].quantity += item.quantity;
        } else {
          state.items.push(item);
        }

        state.cartTotal = calculateCartTotal(state.items);
      } else {
        // Different business. The UI should intercept this and ask for confirmation
        // to clear cart first. If it reaches here, we clear and add.
        state.businessId = businessId;
        state.businessName = businessName;
        state.items = [item];
        state.cartTotal = calculateCartTotal(state.items);
      }
    },
    removeItem: (state, action) => {
      const { cartItemId } = action.payload; // We can use a unique ID for cart items or index
      state.items = state.items.filter((item) => item.cartItemId !== cartItemId);
      state.cartTotal = calculateCartTotal(state.items);

      if (state.items.length === 0) {
        state.businessId = null;
        state.businessName = null;
      }
    },
    updateQuantity: (state, action) => {
      const { cartItemId, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.cartItemId === cartItemId);
      if (existingItem) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.cartItemId !== cartItemId);
        } else {
          existingItem.quantity = quantity;
        }
        state.cartTotal = calculateCartTotal(state.items);
      }

      if (state.items.length === 0) {
        state.businessId = null;
        state.businessName = null;
      }
    },
    clearCart: (state) => {
      state.businessId = null;
      state.businessName = null;
      state.items = [];
      state.cartTotal = 0;
    },
    setCart: (state, action) => {
      // Hydrate state from AsyncStorage
      const { businessId, businessName, items, cartTotal } = action.payload;
      state.businessId = businessId || null;
      state.businessName = businessName || null;
      state.items = items || [];
      state.cartTotal = cartTotal || 0;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
