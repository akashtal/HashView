import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import Monitoring from '../../services/monitoring.service';

// ─── Helper to extract subscription + freeTrial safely from API response ─────
const extractSubscription = (user) => ({
  isPro: user?.isPro || false,
  subscriptionEnabled: user?.subscriptionEnabled !== undefined ? user.subscriptionEnabled : true,
  hasFreeTrial: user?.hasFreeTrial || false,
  freeTrial: user?.freeTrial || { updatesUsed: 0, maxFreeUpdates: 25, remaining: 25 },
  subscription: user?.subscription || { status: 'inactive', plan: null, currentPeriodEnd: null },
});

// Async thunks
export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    Monitoring.Events.loginStarted(credentials.method || 'email');
    const response = await ApiService.login(credentials);

    // Validate Role match
    if (
      credentials.role &&
      response.user.role !== 'admin' &&
      response.user.role !== credentials.role
    ) {
      throw new Error(
        `Wrong account type. This is a ${response.user.role} account. Please login from the ${response.user.role} section.`
      );
    }

    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    await AsyncStorage.removeItem('@last_scratch_awareness');

    // Register push token with backend
    try {
      const pushToken = await NotificationService.getExpoPushToken();
      if (pushToken) {
        await NotificationService.registerTokenWithBackend(pushToken, response.token);
      }
    } catch (error) {
      console.log('⚠️ Could not register push token:', error);
    }

    Monitoring.Events.loginSuccess(response.user, credentials.method || 'email');
    return response;
  } catch (error) {
    Monitoring.Events.loginFailed(credentials.method || 'email', error.message);
    return rejectWithValue(error.message);
  }
});

export const loginAsGuest = createAsyncThunk(
  'auth/loginAsGuest',
  async (_, { rejectWithValue }) => {
    try {
      const guestUser = {
        _id: 'guest-user-id',
        name: 'Guest User',
        email: 'guest@hashview.app',
        role: 'guest',
        isGuest: true,
      };

      return {
        user: guestUser,
        token: 'guest-token',
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const register = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const response = await ApiService.register(userData);
    await AsyncStorage.setItem('token', response.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    await AsyncStorage.removeItem('@last_scratch_awareness');

    // Register push token with backend
    try {
      const pushToken = await NotificationService.getExpoPushToken();
      if (pushToken) {
        await NotificationService.registerTokenWithBackend(pushToken, response.token);
      }
    } catch (error) {
      console.log('⚠️ Could not register push token:', error);
    }

    Monitoring.Events.registerSuccess(response.user, userData.method || 'email');
    return response;
  } catch (error) {
    Monitoring.captureError(error, { feature: 'register' });
    return rejectWithValue(error.message);
  }
});

export const loginWithPhone = createAsyncThunk(
  'auth/loginWithPhone',
  async (data, { rejectWithValue }) => {
    try {
      const response = await ApiService.loginWithPhone(data);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      await AsyncStorage.removeItem('@last_scratch_awareness');

      // Register push token with backend
      try {
        const pushToken = await NotificationService.getExpoPushToken();
        if (pushToken) {
          await NotificationService.registerTokenWithBackend(pushToken, response.token);
        }
      } catch (error) {
        console.log('⚠️ Could not register push token:', error);
      }

      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  Monitoring.Events.logout();
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
});

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }
    const response = await ApiService.getMe();
    // Re-identify user on session restore (app re-open)
    Monitoring.identifyUser(response.user);
    return { user: response.user, token };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

// ─── Check subscription status (called on app foreground) ────────────────────
export const checkSubscriptionStatus = createAsyncThunk(
  'auth/checkSubscriptionStatus',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      // Only run for business owners
      if (auth.user?.role !== 'business') return null;
      const response = await ApiService.getSubscriptionStatus();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    // ─── Subscription state ───────────────────────────────────────────
    isPro: false,
    subscriptionEnabled: true, // kill switch from backend
    hasFreeTrial: true,
    freeTrial: { updatesUsed: 0, maxFreeUpdates: 25, remaining: 25 },
    subscription: {
      status: 'inactive',
      plan: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    // Directly update subscription state (e.g. after returning from browser payment)
    setSubscription: (state, action) => {
      state.isPro = action.payload.isPro ?? state.isPro;
      state.subscriptionEnabled = action.payload.subscriptionEnabled ?? state.subscriptionEnabled;
      state.hasFreeTrial = action.payload.hasFreeTrial ?? state.hasFreeTrial;
      state.freeTrial = action.payload.freeTrial ?? state.freeTrial;
      state.subscription = action.payload.subscription ?? state.subscription;
    },
    // OAuth login success (Google/Apple)
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      // Set subscription + free trial if business owner
      if (action.payload.user?.role === 'business') {
        const sub = extractSubscription(action.payload.user);
        state.isPro = sub.isPro;
        state.subscriptionEnabled = sub.subscriptionEnabled;
        state.hasFreeTrial = sub.hasFreeTrial;
        state.freeTrial = sub.freeTrial;
        state.subscription = sub.subscription;
      }
      // Store in AsyncStorage + identify in monitoring
      AsyncStorage.setItem('token', action.payload.token);
      AsyncStorage.setItem('user', JSON.stringify(action.payload.user));
      AsyncStorage.removeItem('@last_scratch_awareness');
      Monitoring.Events.loginSuccess(action.payload.user, 'oauth');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Populate subscription + free trial for business owners
        if (action.payload.user?.role === 'business') {
          const sub = extractSubscription(action.payload.user);
          state.isPro = sub.isPro;
          state.subscriptionEnabled = sub.subscriptionEnabled;
          state.hasFreeTrial = sub.hasFreeTrial;
          state.freeTrial = sub.freeTrial;
          state.subscription = sub.subscription;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login as Guest
      .addCase(loginAsGuest.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (action.payload.user?.role === 'business') {
          const sub = extractSubscription(action.payload.user);
          state.isPro = sub.isPro;
          state.subscriptionEnabled = sub.subscriptionEnabled;
          state.hasFreeTrial = sub.hasFreeTrial;
          state.freeTrial = sub.freeTrial;
          state.subscription = sub.subscription;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login with phone
      .addCase(loginWithPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginWithPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (action.payload.user?.role === 'business') {
          const sub = extractSubscription(action.payload.user);
          state.isPro = sub.isPro;
          state.subscriptionEnabled = sub.subscriptionEnabled;
          state.hasFreeTrial = sub.hasFreeTrial;
          state.freeTrial = sub.freeTrial;
          state.subscription = sub.subscription;
        }
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Check subscription status (foreground refresh)
      .addCase(checkSubscriptionStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.isPro = action.payload.isPro ?? state.isPro;
          state.subscriptionEnabled =
            action.payload.subscriptionEnabled ?? state.subscriptionEnabled;
          state.hasFreeTrial = action.payload.hasFreeTrial ?? state.hasFreeTrial;
          state.freeTrial = action.payload.freeTrial ?? state.freeTrial;
          state.subscription = action.payload.subscription ?? state.subscription;
        }
      });
  },
});

// Fix 6: Export setSubscription so ProGate and other components can use it directly
export const { clearError, updateUser, loginSuccess, setSubscription } = authSlice.actions;

// ─── Fix 8: App Foreground Subscription Refresh ───────────────────────────────
// Call this once after the Redux store is created (in App.js or store/index.js).
// Whenever the app comes back to foreground, we refresh the subscription status
// for business owners so the Pro gate is always accurate.
export const initForegroundSubscriptionSync = (store) => {
  let appState = AppState.currentState;
  AppState.addEventListener('change', (nextState) => {
    if (appState !== 'active' && nextState === 'active') {
      const { auth } = store.getState();
      if (auth.isAuthenticated && auth.user?.role === 'business') {
        store.dispatch(checkSubscriptionStatus());
      }
    }
    appState = nextState;
  });
};
export default authSlice.reducer;
