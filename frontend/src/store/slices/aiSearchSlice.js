/**
 * AI Search Redux Slice
 *
 * Manages the state for AI-powered search results:
 *  - query / results / loading / error
 *  - applied filter chips
 *  - AI summary message
 *  - pagination
 *  - provider metadata (which AI was used)
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import AISearchService from '../../services/aiSearch.service';

// ─── Async Thunk ──────────────────────────────────────────────────────────────

export const performAISearch = createAsyncThunk(
  'aiSearch/performAISearch',
  async (params, { rejectWithValue }) => {
    try {
      const response = await AISearchService.search(params);
      if (!response.success) {
        return rejectWithValue(response.error || 'Search failed');
      }
      return response;
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'AI search failed';
      return rejectWithValue(message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  // Search input
  query: '',
  sessionId: null,

  // Results
  businesses: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  hasMore: false,

  // AI metadata
  message: '',              // AI-generated summary, e.g. "Found 4 restaurants near you 🍗"
  intent: null,             // Extracted intent filters (also passed to chat for context)
  appliedFilters: [],       // Filter chips for UI
  provider: null,           // Which AI provider was used
  fallbackUsed: false,      // Whether AI fallback (regex) was used
  searchAccuracy: 'exact',  // 'exact' | 'partial' | 'related' | 'none'
  matchNote: null,          // Shown when fuzzy matching was used
  correctedQuery: null,     // Set when the AI corrected a spelling mistake

  // UI state
  loading: false,
  loadingMore: false,
  error: null,
  lastSearchAt: null,
  isAIAvailable: true,      // Optimistic: assume AI is available
};

const aiSearchSlice = createSlice({
  name: 'aiSearch',
  initialState,
  reducers: {
    setQuery(state, action) {
      state.query = action.payload;
    },
    clearSearch(state) {
      state.query = '';
      state.businesses = [];
      state.totalCount = 0;
      state.currentPage = 1;
      state.totalPages = 1;
      state.hasMore = false;
      state.message = '';
      state.intent = null;
      state.appliedFilters = [];
      state.error = null;
      state.searchAccuracy = 'exact';
      state.matchNote = null;
      state.correctedQuery = null;
    },
    setSessionId(state, action) {
      state.sessionId = action.payload;
    },
    markAIUnavailable(state) {
      state.isAIAvailable = false;
    },
    markAIAvailable(state) {
      state.isAIAvailable = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // New search (page 1)
      .addCase(performAISearch.pending, (state, action) => {
        const isLoadMore = action.meta.arg.page > 1;
        if (isLoadMore) {
          state.loadingMore = true;
        } else {
          state.loading = true;
          state.error = null;
          state.businesses = [];
          state.message = '';
          state.appliedFilters = [];
        }
      })
      .addCase(performAISearch.fulfilled, (state, action) => {
        const {
          businesses, pagination, message, intent,
          appliedFilters, meta,
        } = action.payload;

        const isLoadMore = action.meta.arg.page > 1;

        if (isLoadMore) {
          // Append without duplicates
          const existingIds = new Set(state.businesses.map(b => b._id));
          const newBusinesses = businesses.filter(b => !existingIds.has(b._id));
          state.businesses = [...state.businesses, ...newBusinesses];
          state.loadingMore = false;
        } else {
          state.businesses = businesses || [];
          state.loading = false;
          state.message = message || '';
          state.intent = intent || null;           // store intent for chat context
          state.appliedFilters = appliedFilters || [];
          state.provider = meta?.provider || null;
          state.fallbackUsed = meta?.fallbackUsed || false;
          state.sessionId = action.payload.sessionId || state.sessionId;
          state.searchAccuracy = action.payload.searchAccuracy || 'exact';
          state.matchNote = action.payload.matchNote || null;
          state.correctedQuery = intent?.corrected_query || null;
          state.isAIAvailable = true;
          state.lastSearchAt = Date.now();
        }

        state.totalCount = pagination?.total || 0;
        state.currentPage = pagination?.page || 1;
        state.totalPages = pagination?.pages || 1;
        state.hasMore = pagination?.hasMore || false;
        state.error = null;
      })
      .addCase(performAISearch.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload || 'Search failed';

        // If it was a server error (not rate limit/validation), mark AI unavailable
        if (!action.payload?.includes('Rate limit') && !action.payload?.includes('required')) {
          state.isAIAvailable = false;
        }
      });
  },
});

export const {
  setQuery, clearSearch, setSessionId, markAIUnavailable, markAIAvailable,
} = aiSearchSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAISearchState = (state) => state.aiSearch;
export const selectAIBusinesses = (state) => state.aiSearch.businesses;
export const selectAIMessage = (state) => state.aiSearch.message;
export const selectAIFilters = (state) => state.aiSearch.appliedFilters;
export const selectAILoading = (state) => state.aiSearch.loading;
export const selectAILoadingMore = (state) => state.aiSearch.loadingMore;
export const selectAIError = (state) => state.aiSearch.error;
export const selectAIPagination = createSelector(
  [
    (state) => state.aiSearch.totalCount,
    (state) => state.aiSearch.currentPage,
    (state) => state.aiSearch.totalPages,
    (state) => state.aiSearch.hasMore,
  ],
  (totalCount, currentPage, totalPages, hasMore) => ({
    total: totalCount,
    page: currentPage,
    pages: totalPages,
    hasMore,
  })
);

export default aiSearchSlice.reducer;
