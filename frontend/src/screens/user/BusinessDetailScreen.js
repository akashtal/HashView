import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Image, Dimensions, Linking, Share, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import ToastService from '../../utils/ToastService';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getBusiness } from '../../store/slices/businessSlice';
import { getBusinessReviews, clearOldReviews } from '../../store/slices/reviewSlice';
import { updateUser } from '../../store/slices/authSlice';
import COLORS from '../../config/colors';
import { API_CONFIG } from '../../config/api.config';
import ApiService from '../../services/api.service';

// Lightweight relative-time formatter — no external dependency
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years  = Math.floor(days / 365);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Reusable Review Card Component ────────────────────────────────────────────
const ReviewCard = ({ review, handleVideoPress, colors, isOld = false }) => {
  const CATEGORY_KEYS = [
    { key: 'staff', label: 'Staff' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'valueForMoney', label: 'Value' },
    { key: 'location', label: 'Location' },
  ];
  const initial = review.user?.name?.charAt(0)?.toUpperCase() || 'U';
  const avatarColors = ['#6C47FF', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];
  const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];
  const timeAgo = formatRelativeTime(review.updatedAt || review.createdAt);

  return (
    <View className="mb-5 pb-5" style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', opacity: isOld ? 0.88 : 1 }}>
      {/* Reviewer row */}
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: avatarColor }}>
          <Text className="text-white text-lg font-bold">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{review.user?.name || 'Anonymous'}</Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs font-semibold" style={{ color: isOld ? '#9CA3AF' : '#7C3AED' }}>{timeAgo}</Text>
          </View>
        </View>
        <View className="w-10 h-10 rounded-lg items-center justify-center" style={{ backgroundColor: colors.primary }}>
          <Text className="text-white text-sm font-black">{(review.rating * 2).toFixed(0)}</Text>
        </View>
      </View>

      {/* Stars + Emotion */}
      <View className="flex-row items-center mb-2">
        {[...Array(5)].map((_, i) => (
          <Icon key={i} name={i < review.rating ? 'star' : 'star-outline'} size={14} color={i < review.rating ? '#FFA500' : '#D5D5D5'} style={{ marginRight: 1 }} />
        ))}
        {review.emotion && <Text className="text-xs text-gray-400 ml-2">· {review.emotion}</Text>}
      </View>

      {/* Review text */}
      <Text className="text-sm text-gray-800 leading-5 mb-3">{review.comment}</Text>

      {/* Category rating pills */}
      {review.categoryRatings && (() => {
        const rated = CATEGORY_KEYS.filter(c => review.categoryRatings[c.key]);
        if (rated.length === 0) return null;
        return (
          <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
            {rated.map(({ key, label }) => {
              const val = review.categoryRatings[key];
              const color = val >= 8 ? '#10B981' : val >= 6 ? '#F59E0B' : '#EF4444';
              return (
                <View key={key} className="px-2.5 py-1 rounded-full" style={{ backgroundColor: color + '18' }}>
                  <Text className="text-[11px] font-semibold" style={{ color }}>{label} {val.toFixed(1)}</Text>
                </View>
              );
            })}
          </View>
        );
      })()}

      {/* Photos */}
      {review.images && review.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mb-2">
          {review.images.map((img, idx) => (
            <TouchableOpacity key={idx} activeOpacity={0.85}>
              <Image source={{ uri: img.url }} style={{ width: 100, height: 100, borderRadius: 10 }} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Videos */}
      {review.videos && review.videos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {review.videos.map((video, idx) => (
            <TouchableOpacity key={idx} activeOpacity={0.85} style={{ width: 100, height: 100, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} onPress={() => handleVideoPress(video.url)}>
              {video.thumbnail && <Image source={{ uri: video.thumbnail }} style={{ width: 100, height: 100, position: 'absolute' }} resizeMode="cover" />}
              <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="play" size={18} color="#FFF" />
              </View>
              {video.duration && (
                <View style={{ position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '600' }}>
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default function BusinessDetailScreen({ navigation, route }) {

  const dispatch = useDispatch();
  const { businessId, business, fromQR, initialTab } = route.params || {};
  const { selectedBusiness, loading } = useSelector((state) => state.business);
  const { reviews, oldReviews, oldReviewCount, oldReviewsLoading, oldReviewsHasMore, oldReviewsPage } = useSelector((state) => state.review);
  const { user } = useSelector((state) => state.auth);
  const [qrBusiness, setQrBusiness] = useState(null);
  // initialTab param is provided when opening from a push notification
  const [activeTab, setActiveTab] = useState(initialTab || 'reviews');
  const [isFavorite, setIsFavorite] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [menuItems, setMenuItems] = useState({});           // Phase 1: grouped menu data
  const [loadingMenu, setLoadingMenu] = useState(false);   // Phase 1: menu loading state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [showOldReviews, setShowOldReviews] = useState(false);
  const visitTrackedRef = useRef(false);

  // Fetch business data — depends only on route params, NOT on user object
  useEffect(() => {
    if (fromQR && business) {
      setQrBusiness(business);
      fetchBusinessUpdates(business._id);
      fetchMenuItems(business._id);
    } else if (businessId) {
      dispatch(getBusiness(businessId));
      fetchBusinessUpdates(businessId);
      fetchMenuItems(businessId);
    }
    // Clean up old reviews when leaving screen
    return () => { dispatch(clearOldReviews()); };
  }, [businessId, fromQR]);

  // Check favorite status from Redux user.favoritePlaces
  useEffect(() => {
    const targetId = (fromQR && business) ? business._id : businessId;
    if (targetId && user?.favoritePlaces) {
      const isFav = user.favoritePlaces.some(
        fav => (fav?._id || fav)?.toString() === targetId.toString()
      );
      setIsFavorite(isFav);
    }
  }, [businessId, fromQR, user?.favoritePlaces]);

  // Refetch reviews whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const idToFetch = (fromQR && business) ? business._id : businessId;
      if (idToFetch) {
        // Load ALL reviews so existing reviews always appear regardless of age
        dispatch(getBusinessReviews({ businessId: idToFetch, params: { limit: 100 } }));
        setShowOldReviews(false);
        dispatch(clearOldReviews());
      }
      // Track visit (fire-and-forget, once per focus, 5-min server-side cooldown)
      if (idToFetch && !visitTrackedRef.current) {
        visitTrackedRef.current = true;
        ApiService.trackBusinessVisit(idToFetch).catch(() => {});
      }
    }, [businessId, business, fromQR, dispatch])
  );

  const fetchBusinessUpdates = async (busId) => {
    try {
      setLoadingUpdates(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/business/${busId}/updates`);
      const data = await response.json();

      if (data.success) {
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      setUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  // Phase 1: Fetch menu items for this business (grouped by category)
  const fetchMenuItems = async (busId) => {
    try {
      setLoadingMenu(true);
      const res = await ApiService.getMenuItems(busId);
      setMenuItems(res.data || {});
    } catch (e) {
      // Menu is optional — don't show an error if not available
      setMenuItems({});
    } finally {
      setLoadingMenu(false);
    }
  };

  const displayBusiness = fromQR ? qrBusiness : selectedBusiness;

  // 🏨 Compute aggregated category averages from all reviews (like Booking.com)
  const computeCategoryAverages = (reviewList) => {
    const CATEGORIES = ['staff', 'facilities', 'cleanliness', 'comfort', 'valueForMoney', 'location'];
    const sums = {};
    const counts = {};
    CATEGORIES.forEach((k) => { sums[k] = 0; counts[k] = 0; });

    (reviewList || []).forEach((r) => {
      if (r.categoryRatings) {
        CATEGORIES.forEach((k) => {
          if (r.categoryRatings[k]) {
            sums[k] += r.categoryRatings[k];
            counts[k] += 1;
          }
        });
      }
    });

    const averages = {};
    CATEGORIES.forEach((k) => {
      averages[k] = counts[k] > 0 ? (sums[k] / counts[k]) : null;
    });
    return averages;
  };

  const handleAddReview = () => {
    navigation.navigate('AddReview', { business: displayBusiness });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${displayBusiness.name} on HashView!\n\nRating: ${displayBusiness.rating?.average?.toFixed(1) || '0.0'} ⭐\nAddress: ${displayBusiness.address?.fullAddress || 'N/A'}`,
        title: displayBusiness.name
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      // Optimistic update
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);

      const response = await ApiService.toggleFavoriteBusiness(displayBusiness._id);

      if (response.success) {
        // Sync favorites to Redux (safe — MainNavigator uses targeted selectors)
        dispatch(updateUser({ favoritePlaces: response.favorites }));

        ToastService.showSuccess(
          newFavoriteState ? 'Added to Favorites' : 'Removed from Favorites',
          newFavoriteState
            ? `You will now receive updates from ${displayBusiness.name}`
            : `You will no longer receive updates from ${displayBusiness.name}`
        );
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      // Revert state on error
      setIsFavorite(!isFavorite);
      ToastService.showError('Error', 'Failed to update favorites');
    }
  };

  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageViewerVisible(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImage(null);
  };

  const handleVideoPress = (videoUrl) => {
    setSelectedVideo(videoUrl);
    setVideoViewerVisible(true);
  };

  const handleCloseVideoViewer = () => {
    setVideoViewerVisible(false);
    setSelectedVideo(null);
  };

  const handleOpenTripAdvisor = () => {
    const url = displayBusiness?.externalProfiles?.tripAdvisor?.profileUrl;
    if (url) {
      Linking.openURL(url).catch(() => {
        ToastService.showError('Error', 'Could not open TripAdvisor profile');
      });
    }
  };

  const handleOpenGoogleBusiness = () => {
    const googleProfile = displayBusiness?.externalProfiles?.googleBusiness;
    if (!googleProfile) return;

    if (googleProfile.profileUrl) {
      Linking.openURL(googleProfile.profileUrl).catch(() => {
        ToastService.showError('Error', 'Could not open Google Business profile');
      });
    } else if (googleProfile.placeId) {
      const url = `https://search.google.com/local/reviews?placeid=${googleProfile.placeId}`;
      Linking.openURL(url).catch(() => {
        ToastService.showError('Error', 'Could not open Google Business profile');
      });
    } else if (displayBusiness.name && displayBusiness.address?.fullAddress) {
      const searchQuery = encodeURIComponent(`${displayBusiness.name} ${displayBusiness.address.fullAddress}`);
      const url = `https://www.google.com/search?q=${searchQuery}`;
      Linking.openURL(url).catch(() => {
        ToastService.showError('Error', 'Could not open Google Search');
      });
    } else {
      ToastService.showInfo('Info', 'Google Business profile link not available');
    }
  };

  if ((!fromQR && loading) || !displayBusiness) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="flex-1 justify-center items-center"
      >
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </LinearGradient>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Image/Cover - Full Screen */}
        <View className="relative h-[350px]">
          {displayBusiness.coverImage?.url ? (
            <>
              <Image
                source={{ uri: displayBusiness.coverImage.url }}
                style={{ width: SCREEN_WIDTH, height: 350 }}
                resizeMode="cover"
              />
              {/* Dark gradient overlay */}
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
                className="absolute top-0 left-0 right-0 bottom-0"
              />
            </>
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={{ width: SCREEN_WIDTH, height: 350 }}
              className="items-center justify-center"
            >
              <Icon name="business" size={80} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}

          {/* Back Button */}
          <View className="absolute top-12 left-5">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="bg-white/95 w-12 h-12 rounded-full items-center justify-center shadow-lg"
            >
              <Icon name="arrow-back" size={26} color="#111" />
            </TouchableOpacity>
          </View>

          {/* Favorite Button */}
          <View className="absolute top-12 right-5">
            <TouchableOpacity
              onPress={handleToggleFavorite}
              className="bg-white/95 w-12 h-12 rounded-full items-center justify-center shadow-lg"
            >
              <Icon
                name={isFavorite ? "heart" : "heart-outline"}
                size={26}
                color={isFavorite ? "#EF4444" : "#111"}
              />
            </TouchableOpacity>
          </View>

          {/* Gallery Thumbnails */}
          {displayBusiness.images && displayBusiness.images.length > 0 && (
            <View className="absolute bottom-5 left-0 right-0">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {displayBusiness.images.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    className="shadow-md"
                    onPress={() => handleImagePress(img.url)}
                  >
                    <Image
                      source={{ uri: img.url }}
                      className="w-[70px] h-[70px] rounded-xl border-[3px] border-white"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="w-[70px] h-[70px] rounded-xl bg-white/90 items-center justify-center border-2 border-white shadow-md"
                  onPress={() => setActiveTab('gallery')}
                >
                  <Icon name="images" size={28} color={COLORS.primary} />
                  <Text className="text-[10px] font-semibold mt-0.5" style={{ color: COLORS.primary }}>
                    +{displayBusiness.images.length}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Business Info Card */}
        <View className="bg-white px-5 pt-6 pb-5 rounded-t-[28px] -mt-7 shadow-2xl">
          {/* Logo + Name + Rating */}
          <View className="flex-row items-start mb-4">
            {displayBusiness.logo?.url && (
              <View className="w-[70px] h-[70px] rounded-2xl overflow-hidden mr-3.5 border-[3px] border-gray-50 shadow-sm">
                <Image
                  source={{ uri: displayBusiness.logo.url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1.5">
                {displayBusiness.name}
              </Text>
              <View className="flex-row items-center mb-1">
                <Icon name="location" size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1.5 font-medium">
                  {displayBusiness.address?.city || displayBusiness.address?.area || 'Location'}
                </Text>
              </View>
            </View>

            <View className="items-center">
              <LinearGradient
                colors={['#FFF9E6', '#FFF4CC']}
                className="flex-row items-center px-3.5 py-2 rounded-2xl border border-[#FFE5B4]"
              >
                <Icon name="star" size={20} color="#FFA500" />
                <Text className="text-xl font-bold text-amber-500 ml-1.5">
                  {displayBusiness.rating?.average?.toFixed(1) || '0.0'}
                </Text>
              </LinearGradient>
              <Text className="text-xs text-gray-400 mt-1 font-semibold">
                {displayBusiness.rating?.count || 0} reviews
              </Text>
            </View>
          </View>

          {/* Status + Category + Stats */}
          <View className="flex-row items-center mb-4 flex-wrap gap-2">
            {/* Open/Closed Status */}
            {displayBusiness.openStatus && (
              <View
                className="flex-row items-center px-3 py-1.5 rounded-full border"
                style={{
                  backgroundColor: displayBusiness.isOpenNow ? '#ECFDF5' : '#FEF2F2',
                  borderColor: displayBusiness.isOpenNow ? '#10B981' : '#EF4444'
                }}
              >
                <View
                  className="w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: displayBusiness.isOpenNow ? '#10B981' : '#EF4444' }}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: displayBusiness.isOpenNow ? '#10B981' : '#EF4444' }}
                >
                  {displayBusiness.openStatus}
                </Text>
              </View>
            )}

            {/* Category Badge */}
            <View className="bg-[#FFF9F0] px-3 py-1.5 rounded-full">
              <Text className="text-xs font-semibold capitalize" style={{ color: COLORS.secondary }}>
                {displayBusiness.category}
              </Text>
            </View>

            {/* Review Count */}
            {displayBusiness.rating?.count > 0 && (
              <View className="bg-gray-100 px-3 py-1.5 rounded-full flex-row items-center">
                <Text className="text-xs font-semibold text-gray-700 ml-1">
                  {displayBusiness.rating.count} Reviews
                </Text>
              </View>
            )}
          </View>

          {/* ── Business Claim Status Banner ── */}
          {(() => {
            const hasOwner = !!displayBusiness.owner;
            const claimStatus = displayBusiness.claimRequest?.status;
            const isApproved = claimStatus === 'approved';
            const isPending = claimStatus === 'pending';

            if (hasOwner || isApproved) {
              // ✅ Claimed / Verified
              return (
                <View className="flex-row items-center bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4">
                  <Icon name="shield-checkmark" size={16} color="#16A34A" />
                  <Text className="text-green-700 text-xs font-semibold ml-2">Verified Business — Owner Claimed</Text>
                </View>
              );
            }

            if (isPending) {
              // 🕐 Claim under review
              return (
                <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                  <Icon name="time-outline" size={16} color="#D97706" />
                  <Text className="text-amber-700 text-xs font-semibold ml-2">Claim Pending Review</Text>
                </View>
              );
            }

            // ⚠️ Unclaimed — show Claim button only for fully authenticated, non-guest users
            if (user && !user.isGuest) {
              const isBusiness = user.role === 'business';
              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ClaimBusiness', { business: displayBusiness })}
                  activeOpacity={0.85}
                  className="flex-row items-center bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-4"
                >
                  <Icon name="flag-outline" size={16} color="#B45309" />
                  <View className="flex-1 ml-2">
                    <Text className="text-amber-800 text-xs font-bold">Unclaimed Business</Text>
                    <Text className="text-amber-600 text-[10px]">
                      {isBusiness ? "Is this your business? Claim it now →" : "Claim your business listing →"}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={14} color="#B45309" />
                </TouchableOpacity>
              );
            }

            return null;
          })()}

          {/* External Links Row */}
          <View className="flex-row gap-2 mb-4">
            {/* Google Rating */}
            {displayBusiness.externalProfiles?.googleBusiness?.rating && (
              <TouchableOpacity
                onPress={handleOpenGoogleBusiness}
                activeOpacity={0.7}
                className="flex-1 bg-[#E8F4FD] rounded-lg px-2 py-1.5 border border-[#BFDBFE] flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="bg-white w-5 h-5 rounded-full items-center justify-center mr-1.5">
                    <Icon name="logo-google" size={11} color="#4285F4" />
                  </View>
                  <View>
                    <Text className="text-[9px] text-[#4285F4] font-bold">Google</Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-bold text-gray-900 mr-1">
                        {displayBusiness.externalProfiles.googleBusiness.rating.toFixed(1)}
                      </Text>
                      <Icon name="star" size={9} color="#FFA500" />
                    </View>
                  </View>
                </View>
                {displayBusiness.externalProfiles.googleBusiness.reviewCount && (
                  <Text className="text-[8px] text-gray-500 font-medium">
                    ({displayBusiness.externalProfiles.googleBusiness.reviewCount.toLocaleString()})
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* TripAdvisor - Link Only */}
            {displayBusiness.externalProfiles?.tripAdvisor?.profileUrl && (
              <TouchableOpacity
                onPress={handleOpenTripAdvisor}
                activeOpacity={0.7}
                className="flex-1 bg-[#E8F5F1] rounded-lg px-2 py-1.5 border border-[#A7F3D0] flex-row items-center justify-center gap-1.5"
              >
                <Image
                  source={require('../../../assets/tripadvisor.png')}
                  className="w-4 h-4"
                  resizeMode="contain"
                />
                <Text className="text-[11px] text-[#00AA6C] font-bold">View on TripAdvisor</Text>
                <Icon name="open-outline" size={11} color="#00AA6C" />
              </TouchableOpacity>
            )}
          </View>

          {/* Address Section */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.secondary + '20' }}>
                <Icon name="location" size={22} color={COLORS.secondary} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold mb-1.5" style={{ color: COLORS.secondary }}>
                  Address
                </Text>
                <Text className="text-sm text-gray-700 leading-5">
                  {displayBusiness.address?.fullAddress || 'Address not available'}
                </Text>
              </View>
            </View>
          </View>

          {/* Opening Hours */}
          {displayBusiness.openStatus && (
            <View className="bg-gray-50 rounded-2xl p-4 mb-5">
              <View className="flex-row items-start">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.secondary + '20' }}>
                  <Icon name="time" size={22} color={COLORS.secondary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold mb-1.5" style={{ color: COLORS.secondary }}>
                    Opening Hours
                  </Text>
                  <View className="flex-row items-center">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: displayBusiness.isOpenNow ? '#10B981' : '#EF4444' }}
                    />
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: displayBusiness.isOpenNow ? '#10B981' : '#EF4444' }}
                    >
                      {displayBusiness.openStatus}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Navigation Tabs */}
        <View className="bg-white border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
            {[
              { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
              { key: 'menu', label: 'Menu', icon: 'restaurant-outline' },
              { key: 'updates', label: 'Updates & Offers', icon: 'megaphone-outline', badge: updates.length },
              { key: 'gallery', label: 'Gallery', icon: 'images-outline' },
              { key: 'about', label: 'About', icon: 'information-circle-outline' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="py-4 px-4 border-b-2 relative"
                style={{ borderBottomColor: activeTab === tab.key ? COLORS.secondary : 'transparent' }}
              >
                <View className="flex-row items-center">
                  <Icon
                    name={tab.icon}
                    size={18}
                    color={activeTab === tab.key ? COLORS.secondary : '#9CA3AF'}
                  />
                  <Text
                    className={`ml-1.5 text-sm ${activeTab === tab.key ? 'font-bold' : 'font-semibold'}`}
                    style={{ color: activeTab === tab.key ? COLORS.secondary : '#6B7280' }}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge > 0 && (
                    <View className="rounded-full min-w-[20px] h-5 items-center justify-center ml-1.5 px-1.5" style={{ backgroundColor: COLORS.secondary }}>
                      <Text className="text-white text-[11px] font-bold">
                        {tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View className="px-5 py-5 pb-24">

          {/* ── Menu Tab (Phase 1) ── */}
          {activeTab === 'menu' && (
            <View>
              {loadingMenu ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={{ color: '#9CA3AF', marginTop: 10 }}>Loading menu...</Text>
                </View>
              ) : Object.keys(menuItems).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon name="restaurant-outline" size={32} color="#6366F1" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 }}>No menu available</Text>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 }}>
                    This business hasn't added their menu or services yet.
                  </Text>
                </View>
              ) : (
                Object.entries(menuItems).map(([category, items]) => (
                  <View key={category} style={{ marginBottom: 24 }}>
                    {/* Category heading */}
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#6366F1', paddingLeft: 10 }}>
                      {category}
                    </Text>
                    {items.map(item => (
                      <View
                        key={item._id}
                        style={{
                          backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10,
                          flexDirection: 'row', overflow: 'hidden',
                          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
                          shadowOffset: { width: 0, height: 2 }, elevation: 2,
                          opacity: item.isAvailable ? 1 : 0.5
                        }}
                      >
                        {/* Image */}
                        {item.image?.url ? (
                          <TouchableOpacity activeOpacity={0.85} onPress={() => handleImagePress(item.image.url)}>
                            <Image source={{ uri: item.image.url }} style={{ width: 76, height: 76 }} resizeMode="cover" />
                            <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 }}>
                              <Icon name="expand-outline" size={10} color="#FFF" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: 76, height: 76, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="image-outline" size={22} color="#D1D5DB" />
                          </View>
                        )}
                        {/* Info */}
                        <View style={{ flex: 1, padding: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={{ fontWeight: '700', fontSize: 14, color: '#111827', flex: 1, marginRight: 8 }} numberOfLines={1}>
                              {item.name}
                              {item.isPopular && <Text style={{ color: '#F59E0B' }}> ⭐</Text>}
                            </Text>
                            <Text style={{ fontWeight: '700', fontSize: 14, color: '#6366F1' }}>
                              {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}{item.price.toFixed(2)}
                            </Text>
                          </View>
                          {item.description ? (
                            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : null}
                          {/* Duration for services */}
                          {item.duration ? (
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>⏱ {item.duration} min</Text>
                          ) : null}
                          {/* Dietary badges */}
                          {item.dietary?.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                              {item.dietary.slice(0, 3).map(d => (
                                <View key={d} style={{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#166534' }}>{d}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {!item.isAvailable && (
                            <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: '600' }}>Currently unavailable</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Reviews Tab — Exact Booking.com layout */}
          {activeTab === 'reviews' && (
            <View>
              {reviews.length === 0 ? (
                <View className="items-center py-16">
                  <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text className="text-gray-400 mt-4 text-base font-medium">No reviews yet</Text>
                  <Text className="text-gray-300 text-sm mt-1">Be the first to share your experience!</Text>
                </View>
              ) : (
                <View>

                  {/* ── Overall Score Row ── */}
                  <View className="flex-row items-center mb-5">
                    <View className="w-[52px] h-[52px] rounded-xl items-center justify-center mr-3" style={{ backgroundColor: COLORS.primary }}>
                      <Text className="text-white text-xl font-black">
                        {displayBusiness.rating?.average
                          ? (displayBusiness.rating.average * 2).toFixed(1)
                          : (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 2).toFixed(1)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-black text-gray-900">
                        {(() => {
                          const avg = displayBusiness.rating?.average || (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length);
                          if (avg >= 4.5) return 'Exceptional';
                          if (avg >= 4) return 'Very good';
                          if (avg >= 3.5) return 'Good';
                          return 'Reviews';
                        })()}
                      </Text>
                      <Text className="text-sm text-gray-500">{displayBusiness.rating?.count || reviews.length} reviews</Text>
                    </View>
                  </View>

                  {/* ── Categories: 1-column list (Booking.com mobile style) ── */}
                  {(() => {
                    const avgs = computeCategoryAverages(reviews);
                    const CATS = [
                      { key: 'location', label: 'Location' },
                      { key: 'cleanliness', label: 'Cleanliness' },
                      { key: 'valueForMoney', label: 'Value for money' },
                      { key: 'facilities', label: 'Facilities' },
                      { key: 'comfort', label: 'Comfort' },
                      { key: 'staff', label: 'Staff' },
                    ];
                    const available = CATS.filter(c => avgs[c.key] !== null);
                    if (available.length === 0) return null;
                    return (
                      <View className="mb-6">
                        {available.map(({ key, label }) => {
                          const val = avgs[key];
                          return (
                            <View key={key} className="mb-4">
                              <View className="flex-row justify-between items-center mb-1.5">
                                <Text className="text-sm text-gray-800 font-semibold">{label}</Text>
                                <Text className="text-sm font-bold text-gray-900">{val.toFixed(1)}</Text>
                              </View>
                              <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ width: `${(val / 10) * 100}%`, height: '100%', backgroundColor: '#003580', borderRadius: 4 }} />
                              </View>
                            </View>
                          );
                        })}
                        <View className="h-px bg-gray-200 mt-2 mb-2" />
                      </View>
                    );
                  })()}

                  {/* ── Reviews heading ── */}
                  <View className="flex-row items-center justify-between mb-4">
                    <View>
                      <Text className="text-base font-black text-gray-900">All Reviews</Text>
                      <Text className="text-xs text-gray-400 mt-0.5">Most recent first</Text>
                    </View>
                    <View className="bg-purple-50 border border-purple-100 rounded-full px-3 py-1">
                      <Text className="text-xs font-bold text-purple-700">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {/* ── Review Cards ── */}
                  {reviews.length === 0 ? (
                    <View className="items-center py-8 bg-gray-50 rounded-2xl mb-4">
                      <Icon name="chatbubbles-outline" size={40} color="#D1D5DB" />
                      <Text className="text-gray-400 mt-3 font-medium">No reviews yet</Text>
                      <Text className="text-gray-300 text-xs mt-1">Be the first to share your experience!</Text>
                    </View>
                  ) : (
                    reviews.map((review) => <ReviewCard key={review._id} review={review} handleVideoPress={handleVideoPress} colors={COLORS} />)
                  )}

                  {/* ── Show Older Reviews button ── */}
                  {oldReviewCount > 0 && !showOldReviews && (
                    <TouchableOpacity
                      onPress={() => {
                        setShowOldReviews(true);
                        const idToFetch = (fromQR && business) ? business._id : businessId;
                        dispatch(getBusinessReviews({ businessId: idToFetch, params: { type: 'old', limit: 10, page: 1 } }));
                      }}
                      activeOpacity={0.8}
                      className="flex-row items-center justify-center py-3.5 px-5 rounded-2xl border border-gray-200 bg-gray-50 mb-4"
                    >
                      <Icon name="chevron-down-circle-outline" size={18} color="#6B7280" />
                      <Text className="text-sm font-semibold text-gray-600 ml-2">
                        Show {oldReviewCount} Older Review{oldReviewCount > 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* ── Older Reviews (lazy-loaded) ── */}
                  {showOldReviews && (
                    <View>
                      <View className="flex-row items-center mb-4">
                        <View className="flex-1 h-px bg-gray-200" />
                        <View className="mx-3 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                          <Text className="text-xs font-bold text-amber-700">Older Reviews</Text>
                        </View>
                        <View className="flex-1 h-px bg-gray-200" />
                      </View>

                      {oldReviewsLoading && oldReviews.length === 0 ? (
                        <View className="items-center py-8">
                          <ActivityIndicator size="small" color={COLORS.primary} />
                          <Text className="text-gray-400 text-xs mt-2">Loading older reviews...</Text>
                        </View>
                      ) : (
                        oldReviews.map((review) => <ReviewCard key={review._id} review={review} handleVideoPress={handleVideoPress} colors={COLORS} isOld />)
                      )}

                      {oldReviewsHasMore && (
                        <TouchableOpacity
                          onPress={() => {
                            const idToFetch = (fromQR && business) ? business._id : businessId;
                            dispatch(getBusinessReviews({ businessId: idToFetch, params: { type: 'old', limit: 10, page: oldReviewsPage + 1 } }));
                          }}
                          disabled={oldReviewsLoading}
                          activeOpacity={0.8}
                          className="flex-row items-center justify-center py-3 rounded-xl border border-gray-200 bg-white mb-4"
                        >
                          {oldReviewsLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : (
                            <>
                              <Icon name="add-circle-outline" size={16} color={COLORS.primary} />
                              <Text className="text-sm font-semibold ml-2" style={{ color: COLORS.primary }}>Load More</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                </View>
              )}
            </View>
          )}


          {/* Updates & Offers Tab */}
          {activeTab === 'updates' && (
            <View>
              {loadingUpdates ? (
                <View className="items-center py-10">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text className="text-gray-400 mt-3">Loading updates...</Text>
                </View>
              ) : updates.length === 0 ? (
                <View className="items-center py-10">
                  <Icon name="megaphone-outline" size={64} color="#D1D5DB" />
                  <Text className="text-gray-400 mt-4 text-[15px]">No updates yet</Text>
                  <Text className="text-gray-300 text-[13px] mt-1">Check back later for offers!</Text>
                </View>
              ) : (
                updates.map((update) => (
                  <View key={update._id} className="mb-5 bg-white rounded-3xl overflow-hidden shadow-lg">
                    {update.image?.url && (
                      <View className="relative">
                        <Image
                          source={{ uri: update.image.url }}
                          className="w-full h-[200px]"
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.3)']}
                          className="absolute bottom-0 left-0 right-0 h-20"
                        />
                        {/* Type Badge on Image */}
                        <View
                          className="absolute top-4 right-4 rounded-full px-3.5 py-2 flex-row items-center shadow-md"
                          style={{ backgroundColor: update.type === 'offer' ? COLORS.secondary : COLORS.primary }}
                        >
                          <Icon name={update.type === 'offer' ? "pricetag" : "megaphone"} size={14} color="#FFF" />
                          <Text className="text-white text-[11px] font-bold uppercase ml-1">
                            {update.type}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className="p-5">
                      {/* Date Badge if no image */}
                      {!update.image?.url && (
                        <View className="flex-row justify-between items-center mb-3">
                          <View
                            className="rounded-full px-3.5 py-2 flex-row items-center"
                            style={{ backgroundColor: update.type === 'offer' ? COLORS.secondary : COLORS.primary }}
                          >
                            <Icon name={update.type === 'offer' ? "pricetag" : "megaphone"} size={14} color="#FFF" />
                            <Text className="text-white text-[11px] font-bold uppercase ml-1">
                              {update.type}
                            </Text>
                          </View>
                          <View className="bg-gray-100 px-3 py-1.5 rounded-lg">
                            <Text className="text-[11px] text-gray-600 font-semibold">
                              {new Date(update.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                      )}

                      <Text className="text-[19px] font-bold text-gray-900 mb-2.5 leading-6">
                        {update.title}
                      </Text>
                      <Text className="text-[15px] text-gray-600 leading-6 mb-3">
                        {update.description}
                      </Text>

                      {/* Offer Details */}
                      {update.type === 'offer' && update.discountValue > 0 && (
                        <LinearGradient
                          colors={update.type === 'offer' ? ['#FFF9E6', '#FFF4CC'] : ['#F3F4F6', '#E5E7EB']}
                          className="flex-row items-center justify-between px-4 py-3.5 rounded-2xl border"
                          style={{ borderColor: update.type === 'offer' ? '#FFE5B4' : '#D1D5DB' }}
                        >
                          <View className="flex-row items-center">
                            <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: COLORS.secondary }}>
                              <Icon name="pricetag" size={18} color="#FFF" />
                            </View>
                            <View>
                              <Text className="text-base font-bold" style={{ color: COLORS.secondary }}>
                                {update.discountType === 'percentage' ? `${update.discountValue}% OFF` : `£${update.discountValue} OFF`}
                              </Text>
                              <Text className="text-[11px] text-gray-400 mt-0.5">
                                Special Discount
                              </Text>
                            </View>
                          </View>
                          {update.validUntil && (
                            <View className="items-end">
                              <Text className="text-[11px] text-gray-600 font-semibold">
                                Valid till
                              </Text>
                              <Text className="text-[13px] text-gray-900 font-bold mt-0.5">
                                {new Date(update.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                          )}
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <View>
              {displayBusiness.description && (
                <View className="mb-5">
                  <Text className="text-base font-bold text-gray-900 mb-3">
                    About
                  </Text>
                  <Text className="text-sm text-gray-700 leading-5">
                    {displayBusiness.description}
                  </Text>
                </View>
              )}

              {/* Contact Info */}
              {displayBusiness.phone && (
                <View className="mb-3 flex-row items-center">
                  <Icon name="call" size={20} color={COLORS.primary} />
                  <Text className="text-sm text-gray-700 ml-3">
                    {displayBusiness.phone}
                  </Text>
                </View>
              )}

              {displayBusiness.email && (
                <View className="mb-3 flex-row items-center">
                  <Icon name="mail" size={20} color={COLORS.primary} />
                  <Text className="text-sm text-gray-700 ml-3">
                    {displayBusiness.email}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <View>
              {displayBusiness.images && displayBusiness.images.length > 0 ? (
                <View className="flex-row flex-wrap -mx-1.5">
                  {displayBusiness.images.map((img, index) => (
                    <View
                      key={index}
                      className="w-1/2 px-1.5 mb-3"
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="rounded-2xl overflow-hidden shadow-md"
                        onPress={() => handleImagePress(img.url)}
                      >
                        <Image
                          source={{ uri: img.url }}
                          className="w-full h-44 bg-gray-100"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center py-14">
                  <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-5">
                    <Icon name="images-outline" size={50} color="#D1D5DB" />
                  </View>
                  <Text className="text-gray-600 mt-2 text-base font-semibold">No gallery images</Text>
                  <Text className="text-gray-400 mt-1.5 text-sm">Photos will appear here</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView >

      {/* Fixed Bottom Button - Hide for Guest */}
      {
        (!user?.isGuest && user?.role !== 'guest') && (
          <View className="bg-white px-5 pt-4 pb-5 border-t border-gray-100 shadow-2xl">
            <TouchableOpacity
              onPress={handleAddReview}
              activeOpacity={0.85}
              className="shadow-xl"
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-2xl py-4 items-center flex-row justify-center border border-white/20"
              >
                <View className="bg-white/20 w-9 h-9 rounded-full items-center justify-center mr-3">
                  <Icon name="star" size={20} color="#FFF" />
                </View>
                <Text className="text-white text-[17px] font-bold tracking-wide">
                  Write a Review
                </Text>
                <Icon name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8, opacity: 0.8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )
      }

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageViewer}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleCloseImageViewer}
            className="absolute top-12 right-5 z-50 bg-white/20 w-12 h-12 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <Icon name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {/* Full Size Image */}
          <View className="flex-1 items-center justify-center">
            {selectedImage && (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              >
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="contain"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Video Viewer Modal */}
      <Modal
        visible={videoViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideoViewer}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleCloseVideoViewer}
            className="absolute top-12 right-5 z-50 bg-white/20 w-12 h-12 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <Icon name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {/* Video Player */}
          <View className="flex-1 items-center justify-center">
            {selectedVideo && (
              <Video
                source={{ uri: selectedVideo }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5 }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
              />
            )}
          </View>
        </View>
      </Modal>
    </View >
  );
}
