import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/api.service';

export const createReview = createAsyncThunk(
  'review/createReview',
  async (data, { rejectWithValue }) => {
    try {
      const response = await ApiService.createReview(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getBusinessReviews = createAsyncThunk(
  'review/getBusinessReviews',
  async ({ businessId, params }, { rejectWithValue }) => {
    try {
      const response = await ApiService.getBusinessReviews(businessId, params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getUserReviews = createAsyncThunk(
  'review/getUserReviews',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.getUserReviews(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState: {
    reviews: [],
    userReviews: [],
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        state.reviews.unshift(action.payload.review);
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getBusinessReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBusinessReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
      })
      .addCase(getBusinessReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getUserReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.userReviews = action.payload.reviews;
      })
      .addCase(getUserReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSuccessMessage } = reviewSlice.actions;
export default reviewSlice.reducer;

