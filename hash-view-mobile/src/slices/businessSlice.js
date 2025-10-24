import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { businessAPI } from '../services/api';

// Async thunks
export const fetchBusinesses = createAsyncThunk(
  'business/fetchBusinesses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await businessAPI.getBusinesses(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch businesses');
    }
  }
);

export const fetchBusinessById = createAsyncThunk(
  'business/fetchBusinessById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await businessAPI.getBusinessById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch business');
    }
  }
);

export const createBusiness = createAsyncThunk(
  'business/createBusiness',
  async (businessData, { rejectWithValue }) => {
    try {
      const response = await businessAPI.createBusiness(businessData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create business');
    }
  }
);

export const updateBusiness = createAsyncThunk(
  'business/updateBusiness',
  async ({ id, businessData }, { rejectWithValue }) => {
    try {
      const response = await businessAPI.updateBusiness(id, businessData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update business');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'business/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await businessAPI.getCategories();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

const initialState = {
  businesses: [],
  currentBusiness: null,
  categories: [],
  pagination: {
    current: 1,
    pages: 0,
    total: 0,
    limit: 20,
  },
  isLoading: false,
  error: null,
  searchQuery: '',
  filters: {
    category: '',
    minRating: 0,
    radius: 10,
    lat: null,
    lng: null,
  },
};

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        category: '',
        minRating: 0,
        radius: 10,
        lat: null,
        lng: null,
      };
      state.searchQuery = '';
    },
    clearCurrentBusiness: (state) => {
      state.currentBusiness = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch businesses
      .addCase(fetchBusinesses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinesses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businesses = action.payload.businesses;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchBusinesses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch business by ID
      .addCase(fetchBusinessById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinessById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBusiness = action.payload.business;
        state.error = null;
      })
      .addCase(fetchBusinessById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create business
      .addCase(createBusiness.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBusiness.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businesses.unshift(action.payload.business);
        state.error = null;
      })
      .addCase(createBusiness.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update business
      .addCase(updateBusiness.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBusiness.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.businesses.findIndex(
          business => business._id === action.payload.business._id
        );
        if (index !== -1) {
          state.businesses[index] = action.payload.business;
        }
        if (state.currentBusiness?._id === action.payload.business._id) {
          state.currentBusiness = action.payload.business;
        }
        state.error = null;
      })
      .addCase(updateBusiness.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
      });
  },
});

export const {
  clearError,
  setSearchQuery,
  setFilters,
  clearFilters,
  clearCurrentBusiness,
} = businessSlice.actions;

export default businessSlice.reducer;
