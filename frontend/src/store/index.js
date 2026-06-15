import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import businessReducer from './slices/businessSlice';
import reviewReducer from './slices/reviewSlice';
import couponReducer from './slices/couponSlice';
import notificationReducer from './slices/notificationSlice';
import aiSearchReducer from './slices/aiSearchSlice';
import aiChatReducer from './slices/aiChatSlice';
import cartReducer, { setCart } from './slices/cartSlice';
import { initForegroundSubscriptionSync } from './slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Middleware to persist cart state to AsyncStorage on any cart action
const cartPersistenceMiddleware = (storeAPI) => (next) => (action) => {
  const result = next(action);
  // Only persist if the action is a cart action
  if (action.type?.startsWith('cart/')) {
    const cartState = storeAPI.getState().cart;
    AsyncStorage.setItem('@hashview_cart', JSON.stringify(cartState)).catch((err) => {
      console.log('Error saving cart to AsyncStorage', err);
    });
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    business: businessReducer,
    review: reviewReducer,
    coupon: couponReducer,
    notification: notificationReducer,
    aiSearch: aiSearchReducer,
    aiChat: aiChatReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(cartPersistenceMiddleware),
});

// Initialize cart from AsyncStorage
export const initCartSync = async (storeInstance) => {
  try {
    const savedCart = await AsyncStorage.getItem('@hashview_cart');
    if (savedCart) {
      storeInstance.dispatch(setCart(JSON.parse(savedCart)));
    }
  } catch (error) {
    console.log('Error loading cart from AsyncStorage', error);
  }
};

// Fix 8: Auto-refresh subscription status whenever the app returns to foreground.
// This ensures Pro status is always accurate after returning from Stripe's browser flow.
initForegroundSubscriptionSync(store);
initCartSync(store);

export default store;
