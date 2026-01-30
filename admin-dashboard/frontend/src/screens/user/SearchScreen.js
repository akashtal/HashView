import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import { debounce, optimizeImageUri } from '../../utils/performanceHelpers';

export default function SearchScreen({ navigation }) {
  // Use local state instead of Redux to keep search screen independent from home screen
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);

  // Initialize screen - same pattern as UserHomeScreen
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    fetchCategories();
    await checkLocation();
    // Initial fetch after location check (will use location if available)
    fetchFilteredBusinesses();
  };

  const checkLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 10000,
        });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setHasLocation(true);
      } else {
        setHasLocation(false);
      }
    } catch (error) {
      console.error('Error checking location permission or getting location:', error);
      setHasLocation(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await ApiService.getCategories();

      // Add "All" category at the beginning
      const allCategory = {
        _id: 'all',
        name: 'All',
        slug: 'all',
        icon: 'apps',
        color: COLORS.secondary,
        order: -1
      };

      setCategories([allCategory, ...response.categories]);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to empty categories if failed
      setCategories([{
        _id: 'all',
        name: 'All',
        slug: 'all',
        icon: 'apps',
        color: COLORS.secondary
      }]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Backend handles all search and filtering logic - frontend just passes parameters
  // Call API directly and store in local state (independent from home screen)
  const fetchFilteredBusinesses = useCallback(async () => {
    try {
      setSearchLoading(true);
      const params = {};

      // Pass search query to backend (backend handles case-insensitive search)
      if (searchQuery && searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
        console.log('🔍 Searching for:', params.search);
      }

      // Pass category to backend (backend handles case-insensitive matching)
      if (selectedCategory && typeof selectedCategory === 'string' && selectedCategory.trim() !== '') {
        params.category = selectedCategory.trim();
        console.log('🏷️ Filtering by category:', params.category);
      }

      console.log('📡 API params:', params);

      // Call API directly (not through Redux) to keep search screen independent
      let response;
      if (currentLocation) {
        params.latitude = currentLocation.latitude;
        params.longitude = currentLocation.longitude;
        response = await ApiService.getNearbyBusinesses(params);
      } else {
        response = await ApiService.getAllActiveBusinesses(params);
      }

      // API client interceptor already unwraps response.data, so response is already the data object
      // Store results in local state (doesn't affect home screen)
      if (response && response.businesses && Array.isArray(response.businesses)) {
        console.log('✅ Search results received:', response.businesses.length, 'businesses');
        setSearchResults(response.businesses);
      } else {
        console.log('⚠️ No businesses in response. Response structure:', response);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Error fetching businesses:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, selectedCategory, currentLocation]);

  // Debounced search for text input (only for typing, not for initial load)
  const debouncedSearch = useMemo(() => debounce(fetchFilteredBusinesses, 500), [fetchFilteredBusinesses]);

  // Trigger search when category changes (immediate, not debounced)
  useEffect(() => {
    fetchFilteredBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Re-fetch when location becomes available (to get nearby results)
  useEffect(() => {
    // Only re-fetch if location was just set (skip initial null state)
    if (currentLocation) {
      fetchFilteredBusinesses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  // Memoize renderBusiness for performance
  const renderBusiness = useCallback(({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BusinessDetail', { businessId: item._id })}
      className="bg-white rounded-2xl p-3 mb-3 shadow-sm overflow-hidden"
      style={{ height: 120 }}
    >
      <View className="flex-row h-full">
        {/* Logo/Image Section */}
        <View className="w-24 h-full mr-3 rounded-xl overflow-hidden" style={{ backgroundColor: '#FFF9F0' }}>
          {item.coverImage?.url ? (
            <Image
              source={{ uri: optimizeImageUri(item.coverImage.url, 200, 80) }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              cache="force-cache"
            />
          ) : item.logo?.url ? (
            <View className="w-full h-full items-center justify-center">
              <Image
                source={{ uri: optimizeImageUri(item.logo.url, 150, 85) }}
                style={{ width: 70, height: 70, borderRadius: 8 }}
                resizeMode="cover"
                cache="force-cache"
              />
            </View>
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Icon name="business" size={36} color={COLORS.secondary} />
            </View>
          )}
        </View>

        {/* Content Section */}
        <View className="flex-1 justify-between">
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={1}>
              {item.name}
            </Text>

            {/* Ratings Row */}
            <View className="flex-row items-center mb-1 flex-wrap">
              <Icon name="star" size={14} color={COLORS.secondary} />
              <Text className="text-xs text-gray-600 ml-1 mr-2">
                {item.rating?.average?.toFixed(1) || '0.0'}
              </Text>
              {item.externalProfiles?.googleBusiness?.rating && (
                <>
                  <Icon name="logo-google" size={12} color="#4285F4" />
                  <Text className="text-xs text-gray-600 ml-1 mr-2">
                    {item.externalProfiles.googleBusiness.rating.toFixed(1)}
                  </Text>
                </>
              )}
              {item.externalProfiles?.tripAdvisor?.rating && (
                <>
                  <Image
                    source={require('../../../assets/tripadvisor.png')}
                    style={{ width: 12, height: 12 }}
                    resizeMode="contain"
                  />
                  <Text className="text-xs text-gray-600 ml-1">
                    {item.externalProfiles.tripAdvisor.rating.toFixed(1)}
                  </Text>
                </>
              )}
            </View>

            <View className="flex-row items-center">
              <Icon name="location-outline" size={12} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-1 flex-1" numberOfLines={1}>
                {item.address?.fullAddress || 'Location not specified'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#FFF9F0' }}>
              <Text className="text-xs font-semibold capitalize" style={{ color: COLORS.secondary }}>
                {item.category}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#D1D5DB" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation]); // Close useCallback

  // Memoize keyExtractor
  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Search</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-lg">
          <Icon name="search" size={22} color={COLORS.secondary} />
          <TextInput
            className="flex-1 ml-3 text-gray-900 text-base"
            placeholder="Search restaurants, cafes, hotels..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Trigger search on every character change (debounced) or immediately when cleared
              if (text.length === 0) {
                console.log('🔄 Search cleared, fetching all businesses');
                fetchFilteredBusinesses(); // Immediate search when cleared
              } else {
                console.log('⌨️ User typing, triggering debounced search for:', text);
                debouncedSearch(); // Debounced search as user types
              }
            }}
            returnKeyType="search"
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              fetchFilteredBusinesses();
            }}>
              <Icon name="close-circle" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown - Shows results as user types, appears below search bar */}
        {searchQuery.length > 0 && (
          <View
            className="bg-white rounded-2xl shadow-2xl mx-0 mt-2"
            style={{
              maxHeight: 320,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10, // For Android shadow
            }}
          >
            {searchLoading ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={COLORS.secondary} />
                <Text className="text-gray-500 mt-2 text-sm">Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <ScrollView
                className="max-h-80"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {searchResults.slice(0, 10).map((business) => (
                  <TouchableOpacity
                    key={business._id}
                    onPress={() => {
                      setSearchQuery('');
                      navigation.navigate('BusinessDetail', { businessId: business._id });
                    }}
                    className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                  >
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-lg overflow-hidden mr-3 bg-gray-100">
                        {business.coverImage?.url || business.logo?.url ? (
                          <Image
                            source={{ uri: optimizeImageUri(business.coverImage?.url || business.logo?.url, 100, 100) }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Icon name="business" size={20} color={COLORS.secondary} />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                          {business.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Icon name="location-outline" size={12} color="#6B7280" />
                          <Text className="text-xs text-gray-500 ml-1 flex-1" numberOfLines={1}>
                            {business.address?.fullAddress || business.address?.city || 'Location not specified'}
                          </Text>
                        </View>
                        {business.category && (
                          <View className="mt-1">
                            <Text className="text-xs text-gray-400 capitalize">{business.category}</Text>
                          </View>
                        )}
                      </View>
                      <Icon name="chevron-forward" size={20} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                ))}
                {searchResults.length > 10 && (
                  <View className="px-4 py-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500 text-center">
                      Showing 10 of {searchResults.length} results
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View className="py-6 px-4 items-center">
                <Icon name="search-outline" size={32} color="#D1D5DB" />
                <Text className="text-gray-600 mt-2 text-sm font-medium">No results found</Text>
                <Text className="text-gray-400 mt-1 text-xs text-center">
                  Try searching with different keywords
                </Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      <View className="px-6 mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">Browse by Category</Text>
          {selectedCategory && (
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <Text className="text-xs font-semibold text-red-600">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingCategories ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="small" color={COLORS.secondary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingRight: 24, paddingBottom: 2, paddingTop: 2 }}
          >
            {categories.map((category) => {
              const categoryColor = category.color || COLORS.secondary;
              const isAllCategory = category.slug === 'all' || category._id === 'all';
              const filterValue = isAllCategory
                ? null
                : (category.slug || category.value || category.name || '').trim();

              const isSelected = isAllCategory
                ? (!selectedCategory || selectedCategory === null)
                : (selectedCategory === filterValue && filterValue !== '');

              return (
                <TouchableOpacity
                  key={category._id}
                  onPress={() => {
                    if (isAllCategory) {
                      setSelectedCategory(null);
                    } else if (filterValue) {
                      setSelectedCategory(filterValue);
                    }
                  }}
                  activeOpacity={0.8}
                  className="mr-3 items-center"
                  style={{ width: 65 }}
                >
                  {/* Circular Icon Container */}
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isSelected
                        ? '#5e399e'
                        : '#FFFFFF',
                      borderWidth: isSelected ? 0 : 1.5,
                      borderColor: '#E5E7EB',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.15 : 0.08,
                      shadowRadius: 4,
                      elevation: isSelected ? 4 : 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <Icon
                      name={category.icon || 'apps'}
                      size={26}
                      color={isSelected ? '#FFFFFF' : categoryColor}
                    />
                  </View>
                  {/* Category Label */}
                  <Text
                    className={`text-[11px] font-medium text-center ${isSelected ? 'text-[#5e399e]' : 'text-gray-700'
                      }`}
                    numberOfLines={1}
                    style={{ lineHeight: 14 }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Main Results List - Only show when search is empty (dropdown handles active search) */}
        {!searchQuery && (
          <>
            {searchLoading ? (
              <View className="justify-center items-center py-20">
                <ActivityIndicator size="large" color={COLORS.secondary} />
                <Text className="text-gray-500 mt-3">Loading businesses...</Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View className="items-center py-20">
                <Icon name="business-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-900 text-lg font-bold mt-4">No businesses available</Text>
                <Text className="text-gray-500 mt-2 text-center px-8">
                  Try searching or selecting a category
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-sm text-gray-500 mb-3">
                  {searchResults.length} business{searchResults.length !== 1 ? 'es' : ''} available
                </Text>
                <FlatList
                  data={searchResults}
                  renderItem={renderBusiness}
                  keyExtractor={keyExtractor}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={10}
                  updateCellsBatchingPeriod={50}
                  getItemLayout={(data, index) => ({
                    length: 120,
                    offset: 120 * index + (index * 12), // height + margin
                    index
                  })}
                />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}


