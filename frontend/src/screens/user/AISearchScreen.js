import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, StatusBar, Animated, Keyboard, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import COLORS from '../../config/colors';
import { debounce, optimizeImageUri } from '../../utils/performanceHelpers';
import {
  performAISearch,
  clearSearch,
  selectAIBusinesses,
  selectAIMessage,
  selectAIFilters,
  selectAILoading,
  selectAILoadingMore,
  selectAIError,
  selectAIPagination,
  selectAISearchState,
} from '../../store/slices/aiSearchSlice';

// ─── Quick Suggestion Chips ───────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: '🍗 Chicken near me',    query: 'chicken near me' },
  { label: '☕ Best cafes',          query: 'best cafes near me' },
  { label: '🌿 Vegan food',          query: 'vegan restaurants' },
  { label: '🕌 Halal restaurants',   query: 'halal restaurants near me' },
  { label: '🏨 Hotels',              query: 'hotels near me' },
  { label: '🎉 Deals & offers',      query: 'restaurants with deals' },
  { label: '⭐ Top rated',           query: 'top rated near me' },
  { label: '💆 Spa & massage',       query: 'spa near me' },
  { label: '🥗 Vegetarian',         query: 'vegetarian food' },
  { label: '🍕 Pizza',               query: 'pizza near me' },
];

// ─── AI Message Banner ────────────────────────────────────────────────────────

const AIMessageBanner = ({ message, provider, fallbackUsed }) => {
  if (!message) return null;
  return (
    <View style={{
      backgroundColor: '#F0EBFF',
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderLeftWidth: 3,
      borderLeftColor: '#5e399e',
    }}>
      <View style={{
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#5e399e',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10, marginTop: 1, flexShrink: 0,
      }}>
        <Icon name={fallbackUsed ? 'search' : 'sparkles'} size={15} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: '#3B2066', lineHeight: 20, fontWeight: '500' }}>
          {message}
        </Text>
        {provider && (
          <Text style={{ fontSize: 11, color: '#9C7EC9', marginTop: 3 }}>
            {fallbackUsed ? 'Smart search (regex)' : `Powered by AI · ${provider}`}
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Filter Chip ──────────────────────────────────────────────────────────────

const FilterChip = ({ filter }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE9FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    marginRight: 8, marginBottom: 8,
  }}>
    <Text style={{ fontSize: 12, color: '#5e399e', fontWeight: '600' }}>{filter.label}</Text>
  </View>
);

// ─── Business Card ────────────────────────────────────────────────────────────

const BusinessCard = React.memo(({ item, onPress }) => {
  const hashviewRating = item.rating?.average?.toFixed(1) || '0.0';
  const googleRating = item.externalProfiles?.googleBusiness?.rating;
  const coverImageUri = item.coverImage?.url || item.images?.[0]?.url || item.logo?.url || null;
  const locationText = item.address?.fullAddress
    || [item.address?.area, item.address?.city].filter(Boolean).join(', ')
    || item.address?.city || 'Location not specified';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#5e399e',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
      }}
    >
      {/* Cover image strip */}
      {coverImageUri && (
        <View style={{ height: 110, backgroundColor: '#F3F0FF' }}>
          <Image
            source={{ uri: optimizeImageUri(coverImageUri, 400, 110) }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={`cover-${item._id}`}
          />
          {/* Distance badge */}
          {item.distanceKm !== null && item.distanceKm !== undefined && (
            <View style={{
              position: 'absolute', top: 10, right: 10,
              backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12,
              paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center',
            }}>
              <Icon name="location" size={11} color="#fff" />
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700', marginLeft: 3 }}>
                {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)}m` : `${item.distanceKm}km`}
              </Text>
            </View>
          )}
          {/* Deals badge */}
          {item.hasActiveDeals && (
            <View style={{
              position: 'absolute', top: 10, left: 10,
              backgroundColor: '#16A34A', borderRadius: 12,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>
                🎉 {item.activeDealsCount} deal{item.activeDealsCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          {/* Logo (when no cover image) */}
          {!coverImageUri && (
            <View style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: '#F3F0FF', marginRight: 12,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {item.logo?.url ? (
                <Image source={{ uri: optimizeImageUri(item.logo.url, 96, 96) }}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  contentFit="cover" recyclingKey={`logo-${item._id}`} />
              ) : (
                <Icon name="business" size={24} color="#5e399e" />
              )}
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 }} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {/* HashView rating */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="star" size={13} color="#F59E0B" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginLeft: 3 }}>{hashviewRating}</Text>
              </View>
              {/* Google rating */}
              {googleRating && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 1, height: 10, backgroundColor: '#E5E7EB', marginRight: 6 }} />
                  <Icon name="logo-google" size={11} color="#4285F4" />
                  <Text style={{ fontSize: 12, color: '#374151', marginLeft: 3 }}>
                    {parseFloat(googleRating).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Category tag */}
          <View style={{
            backgroundColor: '#F3F0FF', borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8, flexShrink: 0,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#5e399e', textTransform: 'capitalize' }}>
              {item.category}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: coverImageUri ? 0 : 6 }}>
          <Icon name="location-outline" size={12} color="#9CA3AF" />
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4, flex: 1 }} numberOfLines={1}>
            {locationText}
          </Text>
        </View>

        {/* Matching menu items */}
        {item.matchingMenuItems && item.matchingMenuItems.length > 0 && (
          <View style={{
            marginTop: 10, paddingTop: 10,
            borderTopWidth: 1, borderTopColor: '#F3F4F6',
            flexDirection: 'row', flexWrap: 'wrap',
          }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginRight: 6, alignSelf: 'center' }}>
              Matching:
            </Text>
            {item.matchingMenuItems.slice(0, 3).map((menuItem, idx) => (
              <View key={idx} style={{
                backgroundColor: '#F9FAFB', borderRadius: 8,
                paddingHorizontal: 9, paddingVertical: 4,
                flexDirection: 'row', alignItems: 'center',
                marginRight: 6, marginBottom: 4,
              }}>
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>
                  {menuItem.name}
                </Text>
                {menuItem.price && (
                  <Text style={{ fontSize: 12, color: '#5e399e', fontWeight: '800', marginLeft: 5 }}>
                    £{menuItem.price.toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AISearchScreen({ navigation }) {
  const dispatch = useDispatch();
  const businesses     = useSelector(selectAIBusinesses);
  const message        = useSelector(selectAIMessage);
  const appliedFilters = useSelector(selectAIFilters);
  const loading        = useSelector(selectAILoading);
  const loadingMore    = useSelector(selectAILoadingMore);
  const error          = useSelector(selectAIError);
  const pagination     = useSelector(selectAIPagination);
  const { provider, fallbackUsed } = useSelector(selectAISearchState);

  const [searchQuery, setSearchQuery]     = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasSearched, setHasSearched]     = useState(false);
  const [sessionId]                       = useState(() => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  const inputRef = useRef(null);

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    getLocation();
    dispatch(clearSearch());
    return () => { dispatch(clearSearch()); };
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch {}
  };

  // ─── Search Logic ────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (query, page = 1) => {
    if (!query.trim()) return;
    setHasSearched(true);
    Keyboard.dismiss();
    dispatch(performAISearch({
      query: query.trim(),
      page,
      limit: 10,
      sessionId,
      ...(currentLocation ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: 10000,
      } : {}),
    }));
  }, [currentLocation, sessionId, dispatch]);

  const handleTextChange = useCallback((text) => {
    setSearchQuery(text);
    if (text.length === 0) {
      dispatch(clearSearch());
      setHasSearched(false);
    }
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && pagination.hasMore && searchQuery.trim()) {
      dispatch(performAISearch({
        query: searchQuery.trim(),
        page: pagination.page + 1,
        limit: 10,
        sessionId,
        ...(currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 10000,
        } : {}),
      }));
    }
  }, [loading, loadingMore, pagination, searchQuery, currentLocation, sessionId, dispatch]);

  const handleSuggestion = useCallback((query) => {
    setSearchQuery(query);
    runSearch(query);
  }, [runSearch]);

  const keyExtractor = useCallback((item) => item._id, []);

  const renderBusiness = useCallback(({ item }) => (
    <BusinessCard
      item={item}
      onPress={() => navigation.navigate('BusinessDetail', { businessId: item._id })}
    />
  ), [navigation]);

  // ─── List Sub-Components ─────────────────────────────────────────────────────

  const ListHeader = useCallback(() => (
    <View>
      {message && hasSearched && (
        <AIMessageBanner message={message} provider={provider} fallbackUsed={fallbackUsed} />
      )}
      {appliedFilters.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {appliedFilters.map((f, i) => <FilterChip key={i} filter={f} />)}
        </ScrollView>
      )}
      {hasSearched && !loading && businesses.length > 0 && (
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
          {pagination.total} result{pagination.total !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  ), [message, appliedFilters, businesses.length, hasSearched, loading, pagination.total, provider, fallbackUsed]);

  const ListEmpty = useCallback(() => {
    if (loading) return null;

    if (!hasSearched) {
      return (
        <View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 14 }}>
            Try asking for...
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSuggestion(s.query)}
                style={{
                  backgroundColor: '#F3F0FF',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  marginRight: 8,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 13, color: '#5e399e', fontWeight: '600' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Icon name="wifi-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#374151' }}>Search Unavailable</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => runSearch(searchQuery)}
            style={{
              marginTop: 18, backgroundColor: '#5e399e',
              borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Icon name="search-outline" size={32} color="#5e399e" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#374151' }}>No results found</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
          Try different keywords or broaden your search
        </Text>
      </View>
    );
  }, [loading, hasSearched, error, searchQuery, runSearch, handleSuggestion]);

  const ListFooter = useCallback(() => (
    loadingMore ? (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#5e399e" />
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>Loading more...</Text>
      </View>
    ) : (!pagination.hasMore && businesses.length > 0 ? (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#D1D5DB' }}>— End of results —</Text>
      </View>
    ) : null)
  ), [loadingMore, pagination.hasMore, businesses.length]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#3B2066" />

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#3B2066', '#5e399e', '#7C5CC4']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                marginRight: 8, flexDirection: 'row', alignItems: 'center',
              }}>
                <Icon name="sparkles" size={12} color="#E9D5FF" />
                <Text style={{ fontSize: 11, color: '#E9D5FF', fontWeight: '700', marginLeft: 4 }}>AI POWERED</Text>
              </View>
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
              Smart Search
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Type naturally — AI understands you
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#fff', borderRadius: 20,
          paddingHorizontal: 16, paddingVertical: 13,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
        }}>
          {loading && hasSearched ? (
            <ActivityIndicator size="small" color="#5e399e" style={{ marginRight: 12 }} />
          ) : (
            <Icon name="sparkles" size={20} color="#5e399e" style={{ marginRight: 12 }} />
          )}
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: 15, color: '#111827', fontWeight: '500', paddingVertical: 0 }}
            placeholder='e.g. "chicken under £15 near me"'
            placeholderTextColor="#C4B5FD"
            value={searchQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={() => runSearch(searchQuery)}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            selectionColor="#5e399e"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                dispatch(clearSearch());
                setHasSearched(false);
                inputRef.current?.focus();
              }}
              style={{ marginLeft: 8 }}
            >
              <Icon name="close-circle" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>

        {/* Example query hints */}
        {!hasSearched && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 14 }}
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {['"halal pizza"', '"cheap cafes"', '"open now"', '"deals near me"'].map((hint, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setSearchQuery(hint.replace(/"/g, '')); runSearch(hint.replace(/"/g, '')); }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, marginRight: 8,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>{hint}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ─── Loading State ──────────────────────────────────────────────────── */}
      {loading && !loadingMore ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: '#EDE9FF',
            alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          }}>
            <ActivityIndicator size="large" color="#5e399e" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#374151' }}>AI is thinking...</Text>
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Analysing your search query</Text>
        </View>
      ) : (
        // ─── Results List ───────────────────────────────────────────────────
        <FlatList
          data={businesses}
          renderItem={renderBusiness}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ padding: 18, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          windowSize={5}
        />
      )}
    </View>
  );
}
