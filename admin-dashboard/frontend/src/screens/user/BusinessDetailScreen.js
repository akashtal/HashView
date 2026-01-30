import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Image, Dimensions, Linking, Share, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getBusiness } from '../../store/slices/businessSlice';
import { getBusinessReviews } from '../../store/slices/reviewSlice';
import COLORS from '../../config/colors';
import { API_CONFIG } from '../../config/api.config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BusinessDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { businessId, business, fromQR } = route.params || {};
  const { selectedBusiness, loading } = useSelector((state) => state.business);
  const { reviews } = useSelector((state) => state.review);
  const { user } = useSelector((state) => state.auth);
  const [qrBusiness, setQrBusiness] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
  const [isFavorite, setIsFavorite] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  useEffect(() => {
    if (fromQR && business) {
      setQrBusiness(business);
      dispatch(getBusinessReviews({ businessId: business._id, params: { limit: 5 } }));
      fetchBusinessUpdates(business._id);
    } else if (businessId) {
      dispatch(getBusiness(businessId));
      dispatch(getBusinessReviews({ businessId, params: { limit: 5 } }));
      fetchBusinessUpdates(businessId);
    }
  }, [businessId, business, fromQR]);

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

  const displayBusiness = fromQR ? qrBusiness : selectedBusiness;

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

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleImagePress = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageViewerVisible(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImage(null);
  };

  const handleOpenTripAdvisor = () => {
    const url = displayBusiness?.externalProfiles?.tripAdvisor?.profileUrl;
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open TripAdvisor profile');
      });
    }
  };

  const handleOpenGoogleBusiness = () => {
    const googleProfile = displayBusiness?.externalProfiles?.googleBusiness;
    if (!googleProfile) return;

    if (googleProfile.profileUrl) {
      Linking.openURL(googleProfile.profileUrl).catch(() => {
        Alert.alert('Error', 'Could not open Google Business profile');
      });
    } else if (googleProfile.placeId) {
      const url = `https://search.google.com/local/reviews?placeid=${googleProfile.placeId}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open Google Business profile');
      });
    } else if (displayBusiness.name && displayBusiness.address?.fullAddress) {
      const searchQuery = encodeURIComponent(`${displayBusiness.name} ${displayBusiness.address.fullAddress}`);
      const url = `https://www.google.com/search?q=${searchQuery}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open Google Search');
      });
    } else {
      Alert.alert('Info', 'Google Business profile link not available');
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

          {/* External Ratings Row - Ultra Compact */}
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

            {/* TripAdvisor Rating */}
            {displayBusiness.externalProfiles?.tripAdvisor?.rating && (
              <TouchableOpacity
                onPress={handleOpenTripAdvisor}
                activeOpacity={0.7}
                className="flex-1 bg-[#E8F5F1] rounded-lg px-2 py-1.5 border border-[#A7F3D0] flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="bg-white w-5 h-5 rounded-full items-center justify-center mr-1.5">
                    <Image
                      source={require('../../../assets/tripadvisor.png')}
                      className="w-3 h-3"
                      resizeMode="contain"
                    />
                  </View>
                  <View>
                    <Text className="text-[9px] text-[#00AA6C] font-bold">TripAdvisor</Text>
                    <View className="flex-row items-center">
                      <Text className="text-sm font-bold text-gray-900 mr-1">
                        {displayBusiness.externalProfiles.tripAdvisor.rating.toFixed(1)}
                      </Text>
                      <Icon name="star" size={9} color="#FFA500" />
                    </View>
                  </View>
                </View>
                {displayBusiness.externalProfiles.tripAdvisor.reviewCount && (
                  <Text className="text-[8px] text-gray-500 font-medium">
                    ({displayBusiness.externalProfiles.tripAdvisor.reviewCount.toLocaleString()})
                  </Text>
                )}
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
          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <View>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-gray-900">
                  Reviews ({displayBusiness.rating?.count || 0})
                </Text>
              </View>

              {reviews.length === 0 ? (
                <View className="items-center py-10">
                  <Icon name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text className="text-gray-400 mt-4 text-[15px]">No reviews yet</Text>
                  <Text className="text-gray-300 text-[13px] mt-1">Be the first to review!</Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View key={review._id} className="bg-white rounded-2xl p-4 mb-3.5 shadow-sm border border-gray-100">
                    <View className="flex-row justify-between items-start mb-3.5">
                      <View className="flex-row items-center flex-1">
                        <LinearGradient
                          colors={[COLORS.primary + '30', COLORS.primary + '15']}
                          className="w-12 h-12 rounded-full items-center justify-center mr-3.5 border-2"
                          style={{ borderColor: COLORS.primary + '10' }}
                        >
                          <Text className="text-xl font-bold" style={{ color: COLORS.primary }}>
                            {review.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </LinearGradient>
                        <View className="flex-1">
                          <Text className="text-base font-bold text-gray-900 mb-1">
                            {review.user?.name || 'Anonymous User'}
                          </Text>
                          <View className="flex-row items-center">
                            {[...Array(5)].map((_, i) => (
                              <Icon
                                key={i}
                                name={i < review.rating ? "star" : "star-outline"}
                                size={16}
                                color={i < review.rating ? '#FFA500' : '#D1D5DB'}
                                style={{ marginRight: 2 }}
                              />
                            ))}
                            <Text className="text-[13px] font-bold text-amber-500 ml-1.5">
                              {review.rating}.0
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="bg-gray-50 px-2.5 py-1 rounded-lg">
                        <Text className="text-[11px] text-gray-600 font-semibold">
                          {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    {/* Review Text */}
                    <Text className="text-[15px] text-gray-600 leading-5 mb-3">
                      {review.comment}
                    </Text>

                    {/* Review Photos */}
                    {review.images && review.images.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-2"
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {review.images.map((image, idx) => (
                          <TouchableOpacity key={idx} activeOpacity={0.8}>
                            <Image
                              source={{ uri: image.url }}
                              className="w-24 h-24 rounded-xl bg-gray-100"
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* Review Videos */}
                    {review.videos && review.videos.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                      >
                        {review.videos.map((video, idx) => (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.8}
                            className="w-24 h-24 rounded-xl bg-gray-800 items-center justify-center overflow-hidden"
                          >
                            {video.thumbnail && (
                              <Image
                                source={{ uri: video.thumbnail }}
                                className="w-full h-full absolute"
                                resizeMode="cover"
                              />
                            )}
                            <View className="bg-black/60 w-10 h-10 rounded-full items-center justify-center">
                              <Icon name="play" size={24} color="#FFF" />
                            </View>
                            {video.duration && (
                              <View className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded">
                                <Text className="text-white text-[10px] font-semibold">
                                  {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ))
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
                                {update.discountType === 'percentage' ? `${update.discountValue}% OFF` : `₹${update.discountValue} OFF`}
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
      </ScrollView>

      {/* Fixed Bottom Button - Hide for Guest */}
      {(!user?.isGuest && user?.role !== 'guest') && (
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
      )}

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
    </View>
  );
}
