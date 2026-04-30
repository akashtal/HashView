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
      return { ...response, type: params?.type };
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
    reviews: [],           // recent (last 7 days) or all reviews
    oldReviews: [],        // reviews older than 7 days (lazy-loaded)
    oldReviewCount: 0,     // how many old reviews exist (for "Show Older Reviews" button)
    oldReviewsLoading: false,
    oldReviewsPage: 1,
    oldReviewsHasMore: false,
    userReviews: [],
    loading: false,
    error: null,
    successMessage: null,
    createdCoupon: null,
    isNearbyCoupon: false,
    couponBusinessName: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearCreatedCoupon: (state) => {
      state.createdCoupon = null;
      state.isNearbyCoupon = false;
      state.couponBusinessName = null;
    },
    clearOldReviews: (state) => {
      state.oldReviews = [];
      state.oldReviewsPage = 1;
      state.oldReviewsHasMore = false;
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
        if (action.payload.coupon) {
          state.createdCoupon = action.payload.coupon;
          state.isNearbyCoupon = action.payload.isNearbyCoupon || false;
          state.couponBusinessName = action.payload.couponBusinessName || null;
        }
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getBusinessReviews.pending, (state, action) => {
        const isOld = action.meta?.arg?.params?.type === 'old';
        if (isOld) {
          state.oldReviewsLoading = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(getBusinessReviews.fulfilled, (state, action) => {
        const { reviews, oldReviewCount, hasMore, page, type } = action.payload;
        if (type === 'old') {
          state.oldReviewsLoading = false;
          // Append for pagination (page > 1), replace for fresh load
          if (page > 1) {
            state.oldReviews = [...state.oldReviews, ...reviews];
          } else {
            state.oldReviews = reviews;
          }
          state.oldReviewsPage = page || 1;
          state.oldReviewsHasMore = hasMore || false;
        } else {
          state.loading = false;
          state.reviews = reviews;
          // Backend sends oldReviewCount whenever type != 'old'
          if (typeof oldReviewCount === 'number') {
            state.oldReviewCount = oldReviewCount;
          }
        }
      })
      .addCase(getBusinessReviews.rejected, (state, action) => {
        state.loading = false;
        state.oldReviewsLoading = false;
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

export const { clearError, clearSuccessMessage, clearCreatedCoupon, clearOldReviews } = reviewSlice.actions;
export default reviewSlice.reducer;


