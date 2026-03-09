import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import businessReducer from './slices/businessSlice';
import reviewReducer from './slices/reviewSlice';
import couponReducer from './slices/couponSlice';
import notificationReducer from './slices/notificationSlice';
import { initForegroundSubscriptionSync } from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    business: businessReducer,
    review: reviewReducer,
    coupon: couponReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Fix 8: Auto-refresh subscription status whenever the app returns to foreground.
// This ensures Pro status is always accurate after returning from Stripe's browser flow.
initForegroundSubscriptionSync(store);

export default store;


