import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'light', // 'light' or 'dark'
  isLoading: false,
  error: null,
  networkStatus: 'online',
  currentScreen: null,
  bottomTabVisible: true,
  drawerOpen: false,
  searchVisible: false,
  filtersVisible: false,
  locationPermission: null,
  currentLocation: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setNetworkStatus: (state, action) => {
      state.networkStatus = action.payload;
    },
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload;
    },
    setBottomTabVisible: (state, action) => {
      state.bottomTabVisible = action.payload;
    },
    setDrawerOpen: (state, action) => {
      state.drawerOpen = action.payload;
    },
    toggleDrawer: (state) => {
      state.drawerOpen = !state.drawerOpen;
    },
    setSearchVisible: (state, action) => {
      state.searchVisible = action.payload;
    },
    toggleSearch: (state) => {
      state.searchVisible = !state.searchVisible;
    },
    setFiltersVisible: (state, action) => {
      state.filtersVisible = action.payload;
    },
    toggleFilters: (state) => {
      state.filtersVisible = !state.filtersVisible;
    },
    setLocationPermission: (state, action) => {
      state.locationPermission = action.payload;
    },
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setLoading,
  setError,
  clearError,
  setNetworkStatus,
  setCurrentScreen,
  setBottomTabVisible,
  setDrawerOpen,
  toggleDrawer,
  setSearchVisible,
  toggleSearch,
  setFiltersVisible,
  toggleFilters,
  setLocationPermission,
  setCurrentLocation,
} = uiSlice.actions;

export default uiSlice.reducer;
