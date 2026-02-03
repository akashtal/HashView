import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/api.service';

export const getAllActiveBusinesses = createAsyncThunk(
  'business/getAllActiveBusinesses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.getAllActiveBusinesses(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getNearbyBusinesses = createAsyncThunk(
  'business/getNearbyBusinesses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.getNearbyBusinesses(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const searchBusinesses = createAsyncThunk(
  'business/searchBusinesses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.searchBusinesses(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getBusiness = createAsyncThunk(
  'business/getBusiness',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ApiService.getBusiness(id);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerBusiness = createAsyncThunk(
  'business/registerBusiness',
  async (data, { rejectWithValue }) => {
    try {
      console.log('📤 Sending business registration data:', data);
      const response = await ApiService.registerBusiness(data);
      console.log('✅ Business registration response:', response);
      return response;
    } catch (error) {
      console.error('❌ Business registration error:', error);
      const errorData = error?.response?.data;
      const errorMessage = errorData?.message ||
        error?.message ||
        'Failed to register business. Please check your connection and try again.';
      const errorDetails = errorData?.errors || [];
      console.error('Error details:', { message: errorMessage, errors: errorDetails });
      return rejectWithValue({
        message: errorMessage,
        errors: errorDetails
      });
    }
  }
);

export const uploadDocuments = createAsyncThunk(
  'business/uploadDocuments',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const response = await ApiService.uploadDocuments(id, formData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload documents');
    }
  }
);

const businessSlice = createSlice({
  name: 'business',
  initialState: {
    businesses: [],
    nearbyBusinesses: [],
    selectedBusiness: null,
    myBusiness: null,
    loading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasMore: false
    },
    nearbyPagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasMore: false
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedBusiness: (state) => {
      state.selectedBusiness = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllActiveBusinesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllActiveBusinesses.fulfilled, (state, action) => {
        state.loading = false;
        const { businesses, currentPage, totalPages, total } = action.payload;

        if (currentPage === 1) {
          state.businesses = businesses;
        } else {
          // Filter out duplicates based on _id
          const newBusinesses = businesses.filter(
            newBiz => !state.businesses.some(existingBiz => existingBiz._id === newBiz._id)
          );
          state.businesses = [...state.businesses, ...newBusinesses];
        }

        state.pagination = {
          currentPage: currentPage || 1,
          totalPages: totalPages || 1,
          totalCount: total || 0,
          hasMore: currentPage < totalPages
        };
      })
      .addCase(getAllActiveBusinesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getNearbyBusinesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNearbyBusinesses.fulfilled, (state, action) => {
        state.loading = false;
        const { businesses, currentPage, totalPages, total } = action.payload;

        if (currentPage === 1) {
          state.nearbyBusinesses = businesses;
        } else {
          const newBusinesses = businesses.filter(
            newBiz => !state.nearbyBusinesses.some(existingBiz => existingBiz._id === newBiz._id)
          );
          state.nearbyBusinesses = [...state.nearbyBusinesses, ...newBusinesses];
        }

        state.nearbyPagination = {
          currentPage: currentPage || 1,
          totalPages: totalPages || 1,
          totalCount: total || 0,
          hasMore: currentPage < totalPages
        };
      })
      .addCase(getNearbyBusinesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(searchBusinesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchBusinesses.fulfilled, (state, action) => {
        state.loading = false;
        state.businesses = action.payload.businesses;
      })
      .addCase(searchBusinesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBusiness.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBusiness = action.payload.business;
      })
      .addCase(getBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerBusiness.fulfilled, (state, action) => {
        state.loading = false;
        state.myBusiness = action.payload.business;
      })
      .addCase(registerBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearSelectedBusiness } = businessSlice.actions;
export default businessSlice.reducer;

