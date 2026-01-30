import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/api.service';

export const getCoupons = createAsyncThunk(
  'coupon/getCoupons',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.getCoupons(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getRewardHistory = createAsyncThunk(
  'coupon/getRewardHistory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.getRewardHistory(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const couponSlice = createSlice({
  name: 'coupon',
  initialState: {
    coupons: [],
    rewards: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.coupons = action.payload.coupons;
      })
      .addCase(getCoupons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getRewardHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRewardHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.rewards = action.payload.rewards;
      })
      .addCase(getRewardHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = couponSlice.actions;
export default couponSlice.reducer;

