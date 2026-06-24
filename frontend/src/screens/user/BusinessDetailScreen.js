import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
  Linking,
  Share,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import ToastService from '../../utils/ToastService';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getBusiness } from '../../store/slices/businessSlice';
import { getBusinessReviews, clearOldReviews } from '../../store/slices/reviewSlice';
import { updateUser } from '../../store/slices/authSlice';
import { clearCart, addItem, updateQuantity, removeItem } from '../../store/slices/cartSlice';
import COLORS from '../../config/colors';
import { API_CONFIG } from '../../config/api.config';
import ApiService from '../../services/api.service';
import MenuItemModal from '../../components/MenuItemModal';
import MenuTab from './BusinessDetailTabs/MenuTab';
import ReviewsTab from './BusinessDetailTabs/ReviewsTab';
import UpdatesTab from './BusinessDetailTabs/UpdatesTab';
import GalleryTab from './BusinessDetailTabs/GalleryTab';
import AboutTab from './BusinessDetailTabs/AboutTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BusinessDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { businessId, business, fromQR, initialTab, section } = route.params || {};
  const { selectedBusiness, loading } = useSelector((state) => state.business);
  const {
    reviews,
    oldReviews,
    oldReviewCount,
    oldReviewsLoading,
    oldReviewsHasMore,
    oldReviewsPage,
  } = useSelector((state) => state.review);
  const { user } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const [qrBusiness, setQrBusiness] = useState(null);
  // initialTab param is provided when opening from a push notification, section from deep link
  const [activeTab, setActiveTab] = useState(section === 'menu' ? 'menu' : initialTab || 'reviews');
  const [isFavorite, setIsFavorite] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [menuItems, setMenuItems] = useState({}); // Phase 1: grouped menu data
  const [loadingMenu, setLoadingMenu] = useState(false); // Phase 1: menu loading state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [showOldReviews, setShowOldReviews] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
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
    return () => {
      dispatch(clearOldReviews());
    };
  }, [businessId, fromQR]);

  // Check favorite status from Redux user.favoritePlaces
  useEffect(() => {
    const targetId = fromQR && business ? business._id : businessId;
    if (targetId && user?.favoritePlaces) {
      const isFav = user.favoritePlaces.some(
        (fav) => (fav?._id || fav)?.toString() === targetId.toString()
      );
      setIsFavorite(isFav);
    }
  }, [businessId, fromQR, user?.favoritePlaces]);

  // Refetch reviews whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const idToFetch = fromQR && business ? business._id : businessId;
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

  const handleAddReview = () => {
    navigation.navigate('AddReview', { business: displayBusiness });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${displayBusiness.name} on HashView!\n\nRating: ${displayBusiness.rating?.average?.toFixed(1) || '0.0'} ⭐\nAddress: ${displayBusiness.address?.fullAddress || 'N/A'}`,
        title: displayBusiness.name,
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
      const searchQuery = encodeURIComponent(
        `${displayBusiness.name} ${displayBusiness.address.fullAddress}`
      );
      const url = `https://www.google.com/search?q=${searchQuery}`;
      Linking.openURL(url).catch(() => {
        ToastService.showError('Error', 'Could not open Google Search');
      });
    } else {
      ToastService.showInfo('Info', 'Google Business profile link not available');
    }
  };

  const handleMenuItemPress = (item) => {
    // If user tries to add an item from a different business, confirm clearing cart
    if (cart.businessId && cart.businessId !== displayBusiness._id) {
      Alert.alert(
        'Clear existing cart?',
        `You already have items from ${cart.businessName} in your cart. Adding this item will clear your previous cart. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cart & Add',
            style: 'destructive',
            onPress: () => {
              dispatch(clearCart());
              setSelectedMenuItem(item);
              setMenuModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    setSelectedMenuItem(item);
    setMenuModalVisible(true);
  };

  const getItemQuantity = useCallback(
    (itemId) => {
      return cart.items
        .filter((i) => i.menuItem._id === itemId)
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [cart.items]
  );

  const handleDirectAdd = useCallback(
    (item) => {
      if (item.customizationGroups?.length > 0) {
        handleMenuItemPress(item);
        return;
      }
      if (cart.businessId && cart.businessId !== displayBusiness._id) {
        handleMenuItemPress(item);
        return;
      }
      const cartItemId = `${item._id}-default`;
      dispatch(
        addItem({
          businessId: displayBusiness._id,
          businessName: displayBusiness.name,
          item: {
            cartItemId,
            menuItem: item,
            quantity: 1,
            customizationSelections: [],
            itemNotes: '',
            itemTotal: item.price,
          },
        })
      );
    },
    [cart, displayBusiness, dispatch]
  );

  const handleDirectRemove = useCallback(
    (item) => {
      const existingItems = cart.items.filter((i) => i.menuItem._id === item._id);
      if (existingItems.length > 0) {
        const lastItem = existingItems[existingItems.length - 1];
        if (lastItem.quantity > 1) {
          dispatch(
            updateQuantity({ cartItemId: lastItem.cartItemId, quantity: lastItem.quantity - 1 })
          );
        } else {
          dispatch(removeItem({ cartItemId: lastItem.cartItemId }));
        }
      }
    },
    [cart.items, dispatch]
  );

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
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={26}
                color={isFavorite ? '#EF4444' : '#111'}
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
                  <Text
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: COLORS.primary }}
                  >
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
                  borderColor: displayBusiness.isOpenNow ? '#10B981' : '#EF4444',
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
              <Text
                className="text-xs font-semibold capitalize"
                style={{ color: COLORS.secondary }}
              >
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
                  <Text className="text-green-700 text-xs font-semibold ml-2">
                    Verified Business — Owner Claimed
                  </Text>
                </View>
              );
            }

            if (isPending) {
              // 🕐 Claim under review
              return (
                <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
                  <Icon name="time-outline" size={16} color="#D97706" />
                  <Text className="text-amber-700 text-xs font-semibold ml-2">
                    Claim Pending Review
                  </Text>
                </View>
              );
            }

            // ⚠️ Unclaimed — show Claim button only for fully authenticated, non-guest users
            if (user && !user.isGuest) {
              const isBusiness = user.role === 'business';
              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ClaimBusiness', { business: displayBusiness })
                  }
                  activeOpacity={0.85}
                  className="flex-row items-center bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-4"
                >
                  <Icon name="flag-outline" size={16} color="#B45309" />
                  <View className="flex-1 ml-2">
                    <Text className="text-amber-800 text-xs font-bold">Unclaimed Business</Text>
                    <Text className="text-amber-600 text-[10px]">
                      {isBusiness
                        ? 'Is this your business? Claim it now →'
                        : 'Claim your business listing →'}
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
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: COLORS.secondary + '20' }}
              >
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
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: COLORS.secondary + '20' }}
                >
                  <Icon name="time" size={22} color={COLORS.secondary} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-bold mb-1.5"
                    style={{ color: COLORS.secondary }}
                  >
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
              {
                key: 'updates',
                label: 'Updates & Offers',
                icon: 'megaphone-outline',
                badge: updates.length,
              },
              { key: 'gallery', label: 'Gallery', icon: 'images-outline' },
              { key: 'about', label: 'About', icon: 'information-circle-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="py-4 px-4 border-b-2 relative"
                style={{
                  borderBottomColor: activeTab === tab.key ? COLORS.secondary : 'transparent',
                }}
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
                    <View
                      className="rounded-full min-w-[20px] h-5 items-center justify-center ml-1.5 px-1.5"
                      style={{ backgroundColor: COLORS.secondary }}
                    >
                      <Text className="text-white text-[11px] font-bold">{tab.badge}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View className="px-5 py-5 pb-24">
          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <MenuTab
              loadingMenu={loadingMenu}
              menuItems={menuItems}
              handleMenuItemPress={handleMenuItemPress}
              handleImagePress={handleImagePress}
              getItemQuantity={getItemQuantity}
              handleDirectRemove={handleDirectRemove}
              handleDirectAdd={handleDirectAdd}
              categoryOrder={displayBusiness.menuCategoryOrder || []}
            />
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <ReviewsTab
              reviews={reviews}
              displayBusiness={displayBusiness}
              oldReviewCount={oldReviewCount}
              showOldReviews={showOldReviews}
              setShowOldReviews={setShowOldReviews}
              oldReviewsLoading={oldReviewsLoading}
              oldReviews={oldReviews}
              oldReviewsHasMore={oldReviewsHasMore}
              oldReviewsPage={oldReviewsPage}
              handleVideoPress={handleVideoPress}
              dispatch={dispatch}
              targetId={fromQR && business ? business._id : businessId}
            />
          )}

          {/* Updates & Offers Tab */}
          {activeTab === 'updates' && (
            <UpdatesTab loadingUpdates={loadingUpdates} updates={updates} />
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <AboutTab displayBusiness={displayBusiness} />
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <GalleryTab
              displayBusiness={displayBusiness}
              handleImagePress={handleImagePress}
            />
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Container for Primary Action (Review or Cart) */}
      {((!user?.isGuest && user?.role !== 'guest') ||
        (cart.items.length > 0 && cart.businessId === displayBusiness._id)) && (
        <View className="bg-white px-5 pt-4 pb-5 border-t border-gray-100 shadow-2xl">
          {/* Show Cart Button if items exist, otherwise show Review Button */}
          {cart.items.length > 0 && cart.businessId === displayBusiness._id ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              activeOpacity={0.85}
              className="shadow-xl"
            >
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-2xl py-4 px-5 flex-row items-center justify-between border border-white/20"
              >
                <View className="flex-row items-center">
                  <View className="bg-white/20 w-9 h-9 rounded-full items-center justify-center mr-3">
                    <Text className="text-white text-sm font-bold">
                      {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </Text>
                  </View>
                  <Text className="text-white text-[17px] font-bold tracking-wide">View Cart</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-white text-[17px] font-black mr-2">
                    £{cart.cartTotal.toFixed(2)}
                  </Text>
                  <Icon name="arrow-forward" size={20} color="#FFF" style={{ opacity: 0.8 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            !user?.isGuest &&
            user?.role !== 'guest' && (
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
                  <Icon
                    name="arrow-forward"
                    size={20}
                    color="#FFF"
                    style={{ marginLeft: 8, opacity: 0.8 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* Modals */}
      <MenuItemModal
        visible={menuModalVisible}
        onClose={() => setMenuModalVisible(false)}
        item={selectedMenuItem}
        business={displayBusiness}
      />

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
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
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
    </View>
  );
}
