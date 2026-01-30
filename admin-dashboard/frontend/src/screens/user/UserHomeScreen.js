import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, StatusBar, Image, TextInput, Modal, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getAllActiveBusinesses, getNearbyBusinesses, searchBusinesses } from '../../store/slices/businessSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import { FLATLIST_OPTIMIZATIONS, optimizeImageUri } from '../../utils/performanceHelpers';

const RatingBadge = ({ source, rating, reviews }) => {
  const colors = {
    google: '#3B82F6',
    tripadvisor: '#10B981',
    default: '#9CA3AF'
  };
  const labels = {
    google: 'Google',
    tripadvisor: 'TripAdvisor',
    default: source
  };

  const color = colors[source] || colors.default;
  const label = labels[source] || labels.default;

  const renderLogo = () => {
    if (source === 'google') {
      return <Icon name="logo-google" size={14} color="#3B82F6" />;
    }
    if (source === 'tripadvisor') {
      return (
        <Image
          source={require('../../../assets/tripadvisor.png')}
          className="w-4 h-4"
          resizeMode="contain"
        />
      );
    }
    return null;
  };

  return (
    <View className="flex-row items-center justify-between py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
      <View className="flex-row items-center">
        {renderLogo()}
        <Text className="text-sm font-medium text-gray-900 ml-1.5">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <View className="flex-row items-center">
          <Icon name="star" size={13} color="#F4B400" />
          <Text className="text-sm font-semibold text-gray-900 ml-1">
            {rating ? rating.toFixed(1) : 'N/A'}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 ml-2">
          ({reviews || 0})
        </Text>
      </View>
    </View>
  );
};

export default function UserHomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { businesses, nearbyBusinesses, loading } = useSelector((state) => state.business);
  const { user } = useSelector((state) => state.auth);
  const [locationPermission, setLocationPermission] = useState(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  /* --- SEARCH FUNCTIONALITY TEMPORARILY DISABLED ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  --- END SEARCH DISABLE --- */

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Star-based rating filter states
  const [ratingFilter, setRatingFilter] = useState({
    source: null,
    stars: null
  });

  // Distance filter state
  const [distanceFilter, setDistanceFilter] = useState(null);

  // Track active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (ratingFilter.source && ratingFilter.stars) count++;
    if (distanceFilter) count++;
    return count;
  }, [ratingFilter, distanceFilter]);

  useEffect(() => {
    initializeScreen();
    if (user && !user.isGuest) {
      fetchUnreadNotifications();
    }
    loadCategories();
  }, [user]);

  const initializeScreen = async () => {
    dispatch(getAllActiveBusinesses());
    await checkLocationPermission();
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await ApiService.getCategories();
      const allCategory = {
        _id: 'all',
        name: 'All',
        slug: 'all',
        icon: 'apps',
        color: COLORS.secondary,
      };
      setCategories([allCategory, ...(response?.categories || [])]);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([
        {
          _id: 'all',
          name: 'All',
          slug: 'all',
          icon: 'apps',
          color: COLORS.secondary,
        },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const response = await ApiService.getNotifications({ status: 'unread' });
      setUnreadNotifications(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status === 'granted') {
        await getCurrentLocation();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationPermission('denied');
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📡 Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      console.log('✅ Location retrieved:', coords);
      setCurrentLocation(coords);
      setHasLocation(true);

      dispatch(getNearbyBusinesses({
        latitude: coords.latitude,
        longitude: coords.longitude,
        // radius: 50000
        radius: 20000000 // 20,000km (Global) - Show all businesses sorted by distance
      }));
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      setHasLocation(false);

      // Load businesses without location if it failed
      dispatch(getNearbyBusinesses({
        latitude: 51.5283, // Default to London coordinates if location fails
        longitude: -0.1005,
        radius: 20000000 // Global
      }));
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        await getCurrentLocation();
      } else {
        Alert.alert(
          'Location Permission',
          'Location access is needed to show nearby businesses. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  // Backend handles all filtering logic - frontend just passes parameters
  const fetchFilteredBusinesses = useCallback(async () => {
    try {
      const params = {};

      // Pass category to backend (backend handles case-insensitive matching)
      if (selectedCategory && typeof selectedCategory === 'string' && selectedCategory.trim() !== '') {
        params.category = selectedCategory.trim();
      }

      // Pass rating filters to backend
      if (ratingFilter.source && ratingFilter.stars) {
        params.ratingSource = ratingFilter.source;
        params.minRating = ratingFilter.stars;
      }

      // Pass distance filter to backend
      if (distanceFilter) {
        params.distance = distanceFilter;
      }

      // Backend decides which endpoint to use based on location
      if (currentLocation) {
        params.latitude = currentLocation.latitude;
        params.longitude = currentLocation.longitude;

        // If no distance filter is set, use Global Radius (20,000km)
        // This ensures "All Businesses" are shown sorted by distance by default
        if (!distanceFilter) {
          params.radius = 20000000;
        }

        await dispatch(getNearbyBusinesses(params));
      } else {
        await dispatch(getAllActiveBusinesses(params));
      }
    } catch (error) {
      console.error('❌ Error fetching businesses:', error);
    }
  }, [ratingFilter, distanceFilter, currentLocation, selectedCategory, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Reset all filters on refresh to show "All Businesses"
    setSelectedCategory(null);
    setRatingFilter({ source: null, stars: null });
    setDistanceFilter(null); // Assuming this state setter exists

    // We need to fetch with "empty" filters immediately implies Global Scope
    if (currentLocation) {
      await dispatch(getNearbyBusinesses({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: 20000000 // Force Global
      }));
    } else {
      await dispatch(getAllActiveBusinesses());
    }

    setRefreshing(false);
  }, [currentLocation, dispatch]);

  useEffect(() => {
    fetchFilteredBusinesses();
  }, [
    ratingFilter.source,
    ratingFilter.stars,
    distanceFilter,
    selectedCategory,
    fetchFilteredBusinesses,
  ]);

  /* --- SEARCH FUNCTIONALITY TEMPORARILY DISABLED ---
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (!query.trim()) {
      setShowSearchDropdown(false);
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    setShowSearchDropdown(true);
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const params = { search: query.trim(), limit: 10 };
        
        if (hasLocation && user?.location?.coordinates) {
          params.latitude = user.location.coordinates[1];
          params.longitude = user.location.coordinates[0];
        }
        
        const result = await dispatch(searchBusinesses(params)).unwrap();
        console.log(`✅ Search results: ${result.businesses?.length || 0} businesses found`);
        setSearchResults(result.businesses || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [dispatch, hasLocation, user]);

  const handleSelectSearchResult = useCallback((business) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSearchResults([]);
    Keyboard.dismiss();
    navigation.navigate('BusinessDetail', { businessId: business._id });
  }, [navigation]);
  --- END SEARCH DISABLE --- */

  const clearFilters = useCallback(() => {
    setRatingFilter({ source: null, stars: null });
    setDistanceFilter(null);
    setSelectedCategory(null);
    setShowFilterModal(false);
  }, []);

  const applyFilters = useCallback(() => {
    setShowFilterModal(false);
    fetchFilteredBusinesses();
  }, [fetchFilteredBusinesses]);

  // Backend handles all filtering - just use what backend returns
  const displayBusinesses = hasLocation && nearbyBusinesses.length > 0 ? nearbyBusinesses : businesses;
  const isShowingNearby = hasLocation && nearbyBusinesses.length > 0;

  // BUSINESS CARD RENDER - Tailwind CSS Styling
  const renderBusiness = useCallback(({ item }) => {
    const parseRating = (rating) => {
      const parsed = parseFloat(rating);
      return !isNaN(parsed) && parsed > 0 ? parsed : null;
    };

    // FIX: Use externalProfiles (from backend) instead of externalRatings
    const googleRatingValue = parseRating(item.externalProfiles?.googleBusiness?.rating);
    const googleCount = parseInt(item.externalProfiles?.googleBusiness?.reviewCount) || 0;
    const tripAdvisorRatingValue = parseRating(item.externalProfiles?.tripAdvisor?.rating);
    const tripAdvisorCount = parseInt(item.externalProfiles?.tripAdvisor?.reviewCount) || 0;

    // Debug logging for first item
    if (item._id && !renderBusiness.logged) {
      console.log('🏢 Business Card Data:', {
        name: item.name,
        hashviewRating: item.rating?.average,
        externalProfiles: item.externalProfiles,
        googleRating: googleRatingValue,
        googleCount,
        tripAdvisorRating: tripAdvisorRatingValue,
        tripAdvisorCount
      });
      renderBusiness.logged = true;
    }

    const hashviewRating = parseRating(item.rating?.average) || 0;
    const hashviewCount = item.rating?.count || 0;
    const coverImageUri = item.coverImage?.url || item.images?.[0]?.url || item.logo?.url || null;
    const categoryLabel = item.category || 'Business';
    const locationText = [item.address?.area, item.address?.city].filter(Boolean).join(', ') || item.address?.street || 'Location not specified';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('BusinessDetail', { businessId: item._id })}
        activeOpacity={0.85}
        className="mb-4"
      >
        <View className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          {/* Cover Image */}
          <View className="relative h-36 w-full overflow-hidden">
            {coverImageUri ? (
              <Image
                source={{ uri: optimizeImageUri(coverImageUri, 800, 500) }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                className="w-full h-full items-center justify-center"
              >
                <Icon name="business" size={48} color="#FFF" />
              </LinearGradient>
            )}

            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'transparent']}
              className="absolute inset-0"
            />

            {/* Rating Badge */}
            <View className="absolute top-2 right-2">
              <View className="bg-[#5e399e] flex-row items-center px-2.5 py-1 rounded-full shadow border border-[#FDE68A]">
                <Icon name="star" size={13} color="#F4B400" />
                <Text className="text-[#F4B400] font-semibold text-xs ml-1">
                  {hashviewRating ? hashviewRating.toFixed(1) : 'New'}
                </Text>
              </View>
            </View>

            {/* Distance badge */}
            {item.distance !== undefined && item.distance > 0 && (
              <View className="absolute top-2 left-2 bg-white rounded-full px-2 py-0.5 flex-row items-center shadow border border-gray-100">
                <Icon name="navigate" size={11} color={COLORS.secondary} />
                <Text className="text-gray-800 font-semibold text-[10px] ml-1">
                  {item.distance < 1
                    ? `${(item.distance * 1000).toFixed(0)}m away`
                    : `${item.distance.toFixed(1)}km away`}
                </Text>
              </View>
            )}
          </View>

          {/* Header */}
          <View className="px-4 pt-4 pb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[15px] font-semibold text-[#5e399e] flex-1 pr-2" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-[14px] text-[#5e399e]" style={{ opacity: 0.8 }} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="bg-[#FFF1E6] border border-[#FCD9BD] rounded-full px-2 py-0.5">
                <Text className="text-[14px] font-semibold text-[#e6ba4c]" numberOfLines={2}>{categoryLabel}</Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="px-4 pb-4">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-semibold text-gray-900">Overall Rating</Text>
              <Text className="text-xs text-gray-500">{hashviewCount} reviews</Text>
            </View>
            <View className="space-y-1.5">
              <RatingBadge source="google" rating={googleRatingValue} reviews={googleCount} />
              <RatingBadge source="tripadvisor" rating={tripAdvisorRatingValue} reviews={tripAdvisorCount} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header Section */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-10 pb-5 px-5 rounded-b-3xl"
      >
        {/* Top Row: Greeting + Action Buttons */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              Hi {user?.name ? user.name.split(' ')[0] : 'Guest'} 👋
            </Text>
            <Text className="text-white/80 text-[13px] mt-0.5">
              Discover amazing businesses
            </Text>
          </View>

          <View className="flex-row gap-2.5">
            {/* Notifications Bell - Hide for Guest */}
            {user?.name && !user?.isGuest && (
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Notifications');
                  setUnreadNotifications(0);
                }}
                activeOpacity={0.7}
                className="relative"
              >
                <View className="bg-white rounded-full w-11 h-11 items-center justify-center shadow-md">
                  <Icon name="notifications-outline" size={20} color={COLORS.primary} />
                  {unreadNotifications > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 border-2 border-white">
                      <Text className="text-white text-[11px] font-bold">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Filter Button */}
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
              className="relative"
            >
              <View className="bg-white rounded-full w-11 h-11 items-center justify-center shadow-md">
                <Icon name="options-outline" size={20} color={COLORS.primary} />
                {activeFiltersCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white">
                    <Text className="text-white text-[11px] font-bold">
                      {activeFiltersCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Coupons Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Coupons')}
              activeOpacity={0.7}
            >
              <View className="bg-white rounded-full w-11 h-11 items-center justify-center shadow-md">
                <Icon name="gift-outline" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Indicator */}
        {activeFiltersCount > 0 && (
          <View className="flex-row items-center bg-white/20 rounded-xl px-3 py-2 mb-3">
            <Icon name="funnel" size={14} color="#FFF" />
            <Text className="text-white text-xs font-semibold ml-1.5">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
            </Text>
            <TouchableOpacity
              onPress={clearFilters}
              className="ml-auto"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white text-xs underline">Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Search Bar Temporarily Disabled */}
      {false && (
        <View className="px-5 -mt-5 z-50">
          {/* Search UI commented out */}
        </View>
      )}

      {/* Category Slider */}
      <View className="px-2 mt-2">
        <View className="flex-row items-center justify-between mb-3">
          {selectedCategory !== null && (
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              hitSlop={{ top: 10, bottom: 5, left: 10, right: 10 }}
            >
              <Text className="text-sm font-semibold text-[#5e399e]">Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingCategories ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={COLORS.secondary} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
            contentContainerStyle={{ paddingBottom: 0, paddingRight: 12 }}
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
      </View>

      <View className="flex-1 px-4 mt-2">

        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.secondary} />
            <Text className="text-gray-500 mt-4">Loading businesses...</Text>
          </View>
        ) : displayBusinesses.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Icon name="business-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">
              {isShowingNearby ? 'No businesses found nearby' : 'No businesses available'}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              className="mt-4"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                className="rounded-xl px-6 py-3"
              >
                <Text className="text-white font-semibold">Refresh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={displayBusinesses}
            renderItem={renderBusiness}
            keyExtractor={keyExtractor}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            getItemLayout={(data, index) => ({
              length: 140,
              offset: 140 * index,
              index
            })}
          />
        )}
      </View>

      {/* Filter Modal - Keeping existing modal code as is */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl max-h-[600px]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-900">
                  Filters
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-[450px] px-5 py-4" showsVerticalScrollIndicator={false}>
                {/* Rating Filters */}
                <View className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-3">
                    Filter by Rating
                  </Text>

                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Step 1: Select Rating Source
                  </Text>
                  <View className="flex-row flex-wrap mb-4">
                    <TouchableOpacity
                      onPress={() => setRatingFilter({ source: ratingFilter.source === 'hashview' ? null : 'hashview', stars: null })}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${ratingFilter.source === 'hashview' ? '' : 'bg-gray-100'}`}
                      style={ratingFilter.source === 'hashview' ? { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary } : { borderColor: '#E5E7EB' }}
                    >
                      <Icon name="star" size={18} color={ratingFilter.source === 'hashview' ? '#FFF' : '#6B7280'} />
                      <Text className={`ml-2 font-semibold ${ratingFilter.source === 'hashview' ? 'text-white' : 'text-gray-700'}`}>
                        HashView
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setRatingFilter({ source: ratingFilter.source === 'google' ? null : 'google', stars: null })}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${ratingFilter.source === 'google' ? 'bg-[#4285F4]' : 'bg-gray-100'}`}
                      style={ratingFilter.source === 'google' ? { borderColor: '#4285F4' } : { borderColor: '#E5E7EB' }}
                    >
                      <Icon name="logo-google" size={18} color={ratingFilter.source === 'google' ? '#FFF' : '#6B7280'} />
                      <Text className={`ml-2 font-semibold ${ratingFilter.source === 'google' ? 'text-white' : 'text-gray-700'}`}>
                        Google
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setRatingFilter({ source: ratingFilter.source === 'tripadvisor' ? null : 'tripadvisor', stars: null })}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${ratingFilter.source === 'tripadvisor' ? 'bg-[#00AA6C]' : 'bg-gray-100'}`}
                      style={ratingFilter.source === 'tripadvisor' ? { borderColor: '#00AA6C' } : { borderColor: '#E5E7EB' }}
                    >
                      <Image
                        source={require('../../../assets/tripadvisor.png')}
                        className="w-[18px] h-[18px]"
                        resizeMode="contain"
                      />
                      <Text className={`ml-2 font-semibold ${ratingFilter.source === 'tripadvisor' ? 'text-white' : 'text-gray-700'}`}>
                        TripAdvisor
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Star Level */}
                  {ratingFilter.source && (
                    <>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Step 2: Select Star Level
                      </Text>
                      <View className="flex-row flex-wrap">
                        {[5, 4, 3].map((starLevel) => (
                          <TouchableOpacity
                            key={starLevel}
                            onPress={() => setRatingFilter({ ...ratingFilter, stars: ratingFilter.stars === starLevel ? null : starLevel })}
                            activeOpacity={0.7}
                            className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${ratingFilter.stars === starLevel ? 'bg-amber-400' : 'bg-gray-100'}`}
                            style={ratingFilter.stars === starLevel ? { borderColor: '#FFC107' } : { borderColor: '#E5E7EB' }}
                          >
                            {[...Array(starLevel)].map((_, i) => (
                              <Icon
                                key={i}
                                name="star"
                                size={14}
                                color={ratingFilter.stars === starLevel ? '#000' : '#6B7280'}
                              />
                            ))}
                            <Text className={`ml-2 font-semibold ${ratingFilter.stars === starLevel ? 'text-gray-900' : 'text-gray-700'}`}>
                              {starLevel}+ Stars
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>

                {/* Distance Filters */}
                {hasLocation && (
                  <View className="mb-6">
                    <Text className="text-lg font-bold text-gray-900 mb-3">
                      Filter by Distance
                    </Text>
                    <View className="flex-row flex-wrap">
                      <TouchableOpacity
                        onPress={() => setDistanceFilter(distanceFilter === 'nearme' ? null : 'nearme')}
                        activeOpacity={0.7}
                        className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${distanceFilter === 'nearme' ? 'bg-emerald-500' : 'bg-gray-100'}`}
                        style={distanceFilter === 'nearme' ? { borderColor: '#10B981' } : { borderColor: '#E5E7EB' }}
                      >
                        <Icon name="navigate" size={18} color={distanceFilter === 'nearme' ? '#FFF' : '#6B7280'} />
                        <Text className={`ml-2 font-semibold ${distanceFilter === 'nearme' ? 'text-white' : 'text-gray-700'}`}>
                          Near Me
                        </Text>
                      </TouchableOpacity>

                      {['1km', '5km', '10km', '25km'].map((dist) => (
                        <TouchableOpacity
                          key={dist}
                          onPress={() => setDistanceFilter(distanceFilter === dist ? null : dist)}
                          activeOpacity={0.7}
                          className={`flex-row items-center px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${distanceFilter === dist ? 'bg-blue-500' : 'bg-gray-100'}`}
                          style={distanceFilter === dist ? { borderColor: '#3B82F6' } : { borderColor: '#E5E7EB' }}
                        >
                          <Icon name="location" size={18} color={distanceFilter === dist ? '#FFF' : '#6B7280'} />
                          <Text className={`ml-2 font-semibold ${distanceFilter === dist ? 'text-white' : 'text-gray-700'}`}>
                            {dist.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Location Permission */}
                {locationPermission !== 'granted' && (
                  <View className="mb-6">
                    <TouchableOpacity
                      onPress={requestLocationPermission}
                      activeOpacity={0.7}
                      className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200"
                    >
                      <View className="flex-row items-center">
                        <Icon name="location-outline" size={24} color="#3B82F6" />
                        <View className="flex-1 ml-3">
                          <Text className="text-blue-900 font-bold text-sm">
                            Enable Location Access
                          </Text>
                          <Text className="text-blue-700 text-xs mt-1">
                            Get distance-based filters and nearby businesses
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color="#3B82F6" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View className="flex-row px-5 py-4 border-t border-gray-100 gap-3">
                <TouchableOpacity
                  onPress={clearFilters}
                  activeOpacity={0.7}
                  className="flex-1 py-3.5 rounded-xl border-2 border-gray-300 items-center justify-center"
                >
                  <Text className="text-gray-700 font-bold text-[15px]">
                    Clear All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={applyFilters}
                  activeOpacity={0.7}
                  className="flex-1"
                >
                  <LinearGradient
                    colors={[COLORS.secondary, COLORS.secondaryDark]}
                    className="py-3.5 rounded-xl items-center justify-center"
                  >
                    <Text className="text-white font-bold text-[15px]">
                      Apply Filters
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
