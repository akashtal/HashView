import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Notifications from 'expo-notifications';

// Async thunks
export const registerForPushNotifications = createAsyncThunk(
  'notifications/registerForPushNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Failed to get push token for push notification!');
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const schedulePushNotification = createAsyncThunk(
  'notifications/schedulePushNotification',
  async ({ title, body, data }, { rejectWithValue }) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null,
      });
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  expoPushToken: null,
  notifications: [],
  isLoading: false,
  error: null,
  permissionStatus: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setPermissionStatus: (state, action) => {
      state.permissionStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register for push notifications
      .addCase(registerForPushNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerForPushNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expoPushToken = action.payload;
        state.error = null;
      })
      .addCase(registerForPushNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Schedule push notification
      .addCase(schedulePushNotification.fulfilled, (state) => {
        // Notification scheduled successfully
      })
      .addCase(schedulePushNotification.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  addNotification,
  markNotificationAsRead,
  clearNotifications,
  setPermissionStatus,
} = notificationSlice.actions;

export default notificationSlice.reducer;
