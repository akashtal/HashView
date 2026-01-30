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
        state.businesses = action.payload.businesses;
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
        state.nearbyBusinesses = action.payload.businesses;
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

