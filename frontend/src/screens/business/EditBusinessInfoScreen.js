import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import ToastService from '../../utils/ToastService';
import CustomImageCropper from '../../components/CustomImageCropper';
import BusinessPreviewCard from '../../components/BusinessPreviewCard';
import { useDispatch } from 'react-redux';
import { getAllActiveBusinesses } from '../../store/slices/businessSlice';

export default function EditBusinessInfoScreen({ navigation, route }) {
  const { businessId } = route.params;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState([]);

  // Modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [timePickerModal, setTimePickerModal] = useState({
    visible: false,
    day: null,
    field: null,
  });
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  // Prevent Android "AlreadyResumed" crash
  const isPickingRef = useRef(false);
  // Captures image type at PICK time so handleCropComplete never reads stale closure
  const cropTypeRef = useRef(null);

  // State for Custom Image Cropper (same as Registration screen)
  const [cropModal, setCropModal] = useState({
    visible: false,
    imageUri: null,
    type: null, // 'logo' or 'coverImage'
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    website: '',
    category: '',
    radius: '50',
    orderRadius: '50',
  });
  const [images, setImages] = useState({
    logo: null,
    coverImage: null,
    gallery: [],
  });
  const [uploadedImages, setUploadedImages] = useState({
    logo: null,
    coverImage: null,
    gallery: [],
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [originalImages, setOriginalImages] = useState({
    logo: null,
    coverImage: null,
    gallery: [],
  });
  const [openHours, setOpenHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: false },
    sunday: { open: '09:00', close: '17:00', closed: true },
  });

  useEffect(() => {
    fetchCategories();
    fetchBusinessData();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await ApiService.getCategories();

      if (response.success && response.categories) {
        const categoryOptions = response.categories.map((cat) => ({
          label: cat.name,
          value: cat.value || cat.name.toLowerCase(),
        }));
        setCategories(categoryOptions);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      ToastService.showError('Error', 'Failed to load business categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const timeSlots = [
    'Closed',
    '00:00',
    '01:00',
    '02:00',
    '03:00',
    '04:00',
    '05:00',
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
  ];

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getBusiness(businessId);
      const business = response.business;

      setFormData({
        name: business.name || '',
        email: business.email || '',
        phone: business.phone || '',
        address: business.address?.fullAddress || '',
        description: business.description || '',
        website: business.socialMedia?.website || '',
        category: business.category || '',
        radius: business.radius ? String(business.radius) : '50',
        orderRadius: business.orderRadius ? String(business.orderRadius) : '50',
      });

      if (business.openingHours) {
        setOpenHours(business.openingHours);
      }

      // Set original images from business
      const originalImgs = {
        logo: business.logo?.url
          ? { uri: business.logo.url, url: business.logo.url, publicId: business.logo.publicId }
          : null,
        coverImage: business.coverImage?.url
          ? {
              uri: business.coverImage.url,
              url: business.coverImage.url,
              publicId: business.coverImage.publicId,
            }
          : null,
        gallery: (business.images || []).map((img) => ({
          uri: img.url,
          url: img.url,
          publicId: img.publicId,
        })),
      };

      setOriginalImages(originalImgs);

      if (business.logo?.url) {
        setImages((prev) => ({ ...prev, logo: { uri: business.logo.url } }));
        setUploadedImages((prev) => ({
          ...prev,
          logo: { url: business.logo.url, publicId: business.logo.publicId },
        }));
      }
      if (business.coverImage?.url) {
        setImages((prev) => ({ ...prev, coverImage: { uri: business.coverImage.url } }));
        setUploadedImages((prev) => ({
          ...prev,
          coverImage: { url: business.coverImage.url, publicId: business.coverImage.publicId },
        }));
      }
      if (business.images && business.images.length > 0) {
        setImages((prev) => ({
          ...prev,
          gallery: business.images.map((img) => ({ uri: img.url })),
        }));
        setUploadedImages((prev) => ({
          ...prev,
          gallery: business.images.map((img) => ({ url: img.url, publicId: img.publicId })),
        }));
      }
    } catch (error) {
      console.error(error);
      ToastService.showError('Error', 'Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateOpenHours = (day, field, value) => {
    setOpenHours({
      ...openHours,
      [day]: {
        ...openHours[day],
        [field]: value,
        closed: value === 'Closed',
      },
    });
  };

  const pickImage = async (type) => {
    // Guard: prevent Android double-trigger "AlreadyResumed" crash
    if (isPickingRef.current) {
      console.log('[ImagePicker] Already in progress, ignoring tap');
      return;
    }
    isPickingRef.current = true;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        ToastService.showWarning('Permission Required', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: type === 'gallery',
      });

      if (!result.canceled) {
        if (type === 'gallery') {
          // Functional updater avoids stale gallery state
          setImages((prev) => ({ ...prev, gallery: [...prev.gallery, ...result.assets] }));
        } else {
          // Capture type in a ref AT PICK TIME — handleCropComplete reads this
          // instead of the potentially stale cropModal closure value
          cropTypeRef.current = type;
          setCropModal({
            visible: true,
            imageUri: result.assets[0].uri,
            type: type,
          });
        }
      }
    } catch (error) {
      console.error('[ImagePicker] Error:', error);
      if (!String(error?.message).includes('Already resumed')) {
        ToastService.showError('Error', 'Failed to pick image. Please try again.');
      }
    } finally {
      isPickingRef.current = false;
    }
  };

  const handleCropComplete = (croppedImage) => {
    // Read type from ref (captured at pick time) — never stale
    const type = cropTypeRef.current;
    if (!type) return;
    // Functional updaters ensure freshest state is always used
    setImages((prev) => ({ ...prev, [type]: croppedImage }));
    setUploadedImages((prev) => ({ ...prev, [type]: null }));
    cropTypeRef.current = null;
    setCropModal({ visible: false, imageUri: null, type: null });
  };

  const removeGalleryImage = (index) => {
    const newGallery = images.gallery.filter((_, i) => i !== index);
    const newUploadedGallery = uploadedImages.gallery.filter((_, i) => i !== index);
    setImages({ ...images, gallery: newGallery });
    setUploadedImages({ ...uploadedImages, gallery: newUploadedGallery });
  };

  // Upload image to Cloudinary via backend
  const uploadImageToCloudinary = async (imageUri, imageType) => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const extension = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      const fieldName =
        imageType === 'logo' ? 'logo' : imageType === 'coverImage' ? 'coverImage' : 'images';

      formData.append(fieldName, {
        uri: imageUri,
        name: filename,
        type: mimeType,
      });

      // Pass businessId to organize images in business-specific folders
      let response;
      if (imageType === 'logo') {
        response = await ApiService.uploadBusinessLogo(formData, businessId);
      } else if (imageType === 'coverImage') {
        response = await ApiService.uploadBusinessCover(formData, businessId);
      } else {
        response = await ApiService.uploadBusinessGallery(formData, businessId);
      }

      if (response.success || response.data || response.url) {
        const data = response.data || response;

        if (imageType === 'gallery' && response.images && response.images.length > 0) {
          return response.images[0];
        }

        return {
          url: data.url || response.url || data.imageUrl,
          publicId: data.publicId || response.publicId || data.public_id,
        };
      }
      throw new Error(response.message || 'Upload failed');
    } catch (error) {
      console.error(`❌ Error uploading ${imageType}:`, error);
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      throw new Error(errorMessage);
    }
  };

  // Upload multiple gallery images at once
  const uploadGalleryImages = async (galleryImages) => {
    if (!galleryImages || galleryImages.length === 0) return [];

    try {
      const formData = new FormData();

      galleryImages.forEach((img, index) => {
        const filename = img.uri.split('/').pop() || `gallery_${Date.now()}_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const extension = match ? match[1].toLowerCase() : 'jpg';
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

        formData.append('images', {
          uri: img.uri,
          name: filename,
          type: mimeType,
        });
      });

      // ✅ Pass businessId so gallery images go to the business-specific folder
      const response = await ApiService.uploadBusinessGallery(formData, businessId);

      if (response.success && response.images && response.images.length > 0) {
        return response.images.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          originalUri: galleryImages[index]?.uri,
        }));
      }

      throw new Error(response.message || 'Gallery upload failed');
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      ToastService.showWarning('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setUploadingImages(true);

      // Upload new images to Cloudinary IN PARALLEL (much faster than sequential)
      let logoData = uploadedImages.logo;
      let coverImageData = uploadedImages.coverImage;
      let galleryData = [...uploadedImages.gallery];

      const uploadPromises = [];

      // Prepare logo upload
      const needsLogoUpload =
        images.logo &&
        images.logo.uri !== originalImages.logo?.uri &&
        !images.logo.uri.startsWith('http');
      if (needsLogoUpload) {
        uploadPromises.push(
          uploadImageToCloudinary(images.logo.uri, 'logo')
            .then((data) => {
              logoData = data;
              console.log('✅ Logo uploaded:', data.url);
            })
            .catch((error) => {
              throw new Error(`Logo upload failed: ${error.message}`);
            })
        );
      }

      // Prepare cover upload
      const needsCoverUpload =
        images.coverImage &&
        images.coverImage.uri !== originalImages.coverImage?.uri &&
        !images.coverImage.uri.startsWith('http');
      if (needsCoverUpload) {
        uploadPromises.push(
          uploadImageToCloudinary(images.coverImage.uri, 'coverImage')
            .then((data) => {
              coverImageData = data;
              console.log('✅ Cover uploaded:', data.url);
            })
            .catch((error) => {
              throw new Error(`Cover upload failed: ${error.message}`);
            })
        );
      }

      // Prepare gallery upload
      const newGalleryImages = images.gallery.filter(
        (img) => !originalImages.gallery.some((orig) => orig.uri === img.uri)
      );
      if (newGalleryImages.length > 0) {
        uploadPromises.push(
          uploadGalleryImages(newGalleryImages)
            .then((uploadedNewGallery) => {
              galleryData = [
                ...uploadedImages.gallery.filter((existing) =>
                  images.gallery.some(
                    (img) => img.uri === existing.url || img.uri === existing.originalUri
                  )
                ),
                ...uploadedNewGallery,
              ];
              console.log(`✅ Gallery uploaded: ${uploadedNewGallery.length} new images`);
            })
            .catch((error) => {
              console.error('Gallery upload warning:', error);
              ToastService.showWarning(
                'Upload Warning',
                'Some gallery images failed. Continuing...'
              );
            })
        );
      }

      // Upload ALL images in parallel — much faster
      if (uploadPromises.length > 0) {
        try {
          await Promise.all(uploadPromises);
          setUploadedImages({ logo: logoData, coverImage: coverImageData, gallery: galleryData });
        } catch (error) {
          ToastService.showError('Upload Error', error.message);
          setSaving(false);
          setUploadingImages(false);
          return;
        }
      }

      setUploadingImages(false);

      // Update business basic info
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        website: formData.website,
        category: formData.category,
        radius: parseInt(formData.radius) || 50,
        orderRadius: parseInt(formData.orderRadius) || 50,
        openingHours: openHours,
      };

      await ApiService.updateBusiness(businessId, updateData);

      // Update images separately if any were changed
      const imageUpdateData = {};
      let imagesChanged = false;

      // Check if logo changed
      if (images.logo && images.logo.uri !== originalImages.logo?.uri) {
        if (logoData && logoData.url) {
          imageUpdateData.logo = logoData.url;
          imageUpdateData.logoPublicId = logoData.publicId || logoData.public_id;
          imagesChanged = true;
          console.log('✅ Logo will be updated:', logoData.url);
        }
      } else if (images.logo && originalImages.logo?.url) {
        // Keep existing logo if not changed
        imageUpdateData.logo = originalImages.logo.url;
        imageUpdateData.logoPublicId = originalImages.logo.publicId;
      }

      // Check if cover image changed
      if (images.coverImage && images.coverImage.uri !== originalImages.coverImage?.uri) {
        if (coverImageData && coverImageData.url) {
          imageUpdateData.coverImage = coverImageData.url;
          imageUpdateData.coverImagePublicId = coverImageData.publicId || coverImageData.public_id;
          imagesChanged = true;
          console.log('✅ Cover image will be updated:', coverImageData.url);
        }
      } else if (images.coverImage && originalImages.coverImage?.url) {
        // Keep existing cover if not changed
        imageUpdateData.coverImage = originalImages.coverImage.url;
        imageUpdateData.coverImagePublicId = originalImages.coverImage.publicId;
      }

      // Update gallery if changed
      if (
        images.gallery.length !== originalImages.gallery.length ||
        images.gallery.some((img) => !originalImages.gallery.some((orig) => orig.uri === img.uri))
      ) {
        imageUpdateData.images = galleryData
          .filter((img) => img && img.url)
          .map((img) => ({
            url: img.url,
            publicId: img.publicId || img.public_id || null,
          }));
        imagesChanged = true;
        console.log(`✅ Gallery will be updated: ${imageUpdateData.images.length} images`);
      } else if (images.gallery.length > 0 && originalImages.gallery.length > 0) {
        // Keep existing gallery if not changed
        imageUpdateData.images = originalImages.gallery
          .filter((img) => img && img.url)
          .map((img) => ({
            url: img.url,
            publicId: img.publicId || null,
          }));
      }

      // Always update images if any image fields are present
      if (Object.keys(imageUpdateData).length > 0) {
        console.log('📤 Updating business images in database...', {
          hasLogo: !!imageUpdateData.logo,
          hasCover: !!imageUpdateData.coverImage,
          galleryCount: imageUpdateData.images?.length || 0,
        });
        await ApiService.updateBusinessImages(businessId, imageUpdateData);
        console.log('✅ Business images updated in database');
      }

      ToastService.showSuccess('Success', 'Business information updated successfully');
      // Force the home screen to re-fetch business data so the new cover image
      // is loaded from the API (not served from the stale Redux cache).
      dispatch(getAllActiveBusinesses());
      navigation.goBack();
    } catch (error) {
      ToastService.showError('Error', error.message || 'Failed to update business');
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  if (loading) {
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
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} className="pt-12 pb-6 px-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Icon name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold" numberOfLines={1}>
              Edit Business Info
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPreviewModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)',
              marginLeft: 8,
            }}
            activeOpacity={0.75}
          >
            <Icon name="eye-outline" size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>
              Preview
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-900 font-semibold">Business Logo</Text>
            {images.logo && images.logo.uri !== originalImages.logo?.uri && (
              <View className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full">
                <Icon name="information-circle" size={16} color="#3B82F6" />
                <Text className="text-blue-700 text-xs font-semibold ml-1">Changed</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => pickImage('logo')}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 py-8 items-center justify-center relative"
            disabled={saving || uploadingImages}
          >
            {images.logo ? (
              <View className="items-center">
                <Image
                  key={images.logo?.uri}
                  source={{ uri: images.logo.uri }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
                {images.logo.uri !== originalImages.logo?.uri && (
                  <View className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                    <Icon name="refresh" size={14} color="#FFF" />
                  </View>
                )}
              </View>
            ) : (
              <>
                <Icon name="image-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2">Change Logo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Cover Image */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-900 font-semibold">Cover Image</Text>
            {images.coverImage && images.coverImage.uri !== originalImages.coverImage?.uri && (
              <View className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full">
                <Icon name="information-circle" size={16} color="#3B82F6" />
                <Text className="text-blue-700 text-xs font-semibold ml-1">Changed</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => pickImage('coverImage')}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 py-8 items-center justify-center relative"
            disabled={saving || uploadingImages}
          >
            {images.coverImage ? (
              <View className="w-full relative">
                <Image
                  key={images.coverImage?.uri}
                  source={{ uri: images.coverImage.uri }}
                  className="w-full h-32 rounded-lg"
                  resizeMode="cover"
                />
                {images.coverImage.uri !== originalImages.coverImage?.uri && (
                  <View className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                    <Icon name="refresh" size={14} color="#FFF" />
                  </View>
                )}
              </View>
            ) : (
              <>
                <Icon name="image-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2">Change Cover Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Gallery Images */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-900 font-semibold">Gallery Images</Text>
            <Text className="text-xs text-gray-500">Optional</Text>
          </View>

          {/* Gallery Images Grid */}
          {images.gallery.length > 0 && (
            <View className="flex-row flex-wrap mb-3">
              {images.gallery.map((img, index) => {
                const isNew = !originalImages.gallery.some((orig) => orig.uri === img.uri);

                return (
                  <View key={index} className="relative mr-2 mb-2">
                    <Image
                      source={{ uri: img.uri }}
                      className="w-20 h-20 rounded-lg"
                      resizeMode="cover"
                    />
                    {isNew && (
                      <View className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                        <Icon name="add" size={12} color="#FFF" />
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => removeGalleryImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                    >
                      <Icon name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            onPress={() => pickImage('gallery')}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 py-8 items-center justify-center"
            disabled={saving || uploadingImages}
          >
            <Icon name="images-outline" size={32} color="#D1D5DB" />
            <Text className="text-gray-500 mt-2">
              {images.gallery.length > 0
                ? `Add More Images (${images.gallery.length} total)`
                : 'Add Gallery Images'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════
            LIVE LISTING PREVIEW STRIP
            Updates in real-time as owner edits the form.
        ═══════════════════════════════════════════════ */}
        <View
          style={{
            marginBottom: 20,
            backgroundColor: '#F3F0FF',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: '#C4B5FD',
          }}
        >
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: '#5e399e',
                borderRadius: 8,
                padding: 6,
                marginRight: 10,
              }}
            >
              <Icon name="eye-outline" size={16} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#3730a3' }}>
                Live Preview
              </Text>
              <Text style={{ fontSize: 11, color: '#6D28D9' }}>
                This is how your listing appears to customers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPreviewModalVisible(true)}
              style={{
                backgroundColor: '#5e399e',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Icon name="expand-outline" size={13} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                Full View
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview card */}
          <BusinessPreviewCard
            name={formData.name}
            category={formData.category}
            coverImageUri={images.coverImage?.uri || null}
            address={formData.address}
          />
        </View>

        {/* Business Name */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Business Name *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Email *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
          />
        </View>

        {/* Phone */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Phone Number *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
          />
        </View>

        {/* Address */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Address</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Description</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
          />
        </View>

        {/* Website */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Website</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            keyboardType="url"
            autoCapitalize="none"
            value={formData.website}
            onChangeText={(value) => handleInputChange('website', value)}
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Business Category</Text>
          <TouchableOpacity
            onPress={() => setCategoryModalVisible(true)}
            className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex-row justify-between items-center"
          >
            <Text className="text-gray-900 font-medium">
              {categories.find((c) => c.value === formData.category)?.label || 'Select Category'}
            </Text>
            <Icon name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Opening Hours */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-3">Opening Hours</Text>
          {Object.keys(openHours).map((day) => (
            <View key={day} className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 w-24 capitalize">{day}:</Text>

              <View className="flex-row flex-1">
                <TouchableOpacity
                  onPress={() => setTimePickerModal({ visible: true, day, field: 'open' })}
                  className="flex-1 mr-2 bg-white rounded-xl px-3 py-3 border border-gray-200"
                >
                  <Text className="text-gray-900 text-center font-medium">
                    {openHours[day].open}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTimePickerModal({ visible: true, day, field: 'close' })}
                  disabled={openHours[day].open === 'Closed'}
                  className={`flex-1 ml-2 bg-white rounded-xl px-3 py-3 border border-gray-200 ${
                    openHours[day].open === 'Closed' ? 'opacity-50' : ''
                  }`}
                >
                  <Text className="text-gray-900 text-center font-medium">
                    {openHours[day].close}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Geofencing Settings */}
        <View className="mb-8">
          <Text className="text-gray-900 font-semibold mb-3">Geofencing Settings</Text>
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 font-medium mb-1 text-sm">Review Radius (m)</Text>
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                keyboardType="numeric"
                value={formData.radius}
                onChangeText={(value) => handleInputChange('radius', value)}
                placeholder="e.g. 50"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-700 font-medium mb-1 text-sm">Order Radius (m)</Text>
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
                keyboardType="numeric"
                value={formData.orderRadius}
                onChangeText={(value) => handleInputChange('orderRadius', value)}
                placeholder="e.g. 50"
              />
            </View>
          </View>
          <Text className="text-gray-500 text-xs text-center">
            Set the maximum distance (10-500m) users must be within to post a review or place an
            order.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploadingImages}
          activeOpacity={0.8}
          className="mb-8"
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            className="rounded-xl py-4 items-center"
          >
            {saving || uploadingImages ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFF" size="small" />
                <Text className="text-white font-bold text-lg ml-3">
                  {uploadingImages ? 'Uploading Images...' : 'Saving Changes...'}
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              {loadingCategories ? (
                <View className="py-8">
                  <ActivityIndicator size="small" color="#9333EA" />
                  <Text className="text-center text-gray-500 mt-2">Loading categories...</Text>
                </View>
              ) : (
                categories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    onPress={() => {
                      handleInputChange('category', category.value);
                      setCategoryModalVisible(false);
                    }}
                    className={`py-4 px-4 rounded-xl mb-2 border ${
                      formData.category === category.value
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        formData.category === category.value ? 'text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTimePickerModal({ ...timePickerModal, visible: false })}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xl font-bold text-gray-900 capitalize">
                  {timePickerModal.day}
                </Text>
                <Text className="text-sm text-gray-600">
                  Select {timePickerModal.field === 'open' ? 'opening' : 'closing'} time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTimePickerModal({ ...timePickerModal, visible: false })}
              >
                <Icon name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="flex-row flex-wrap">
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => {
                      const { day, field } = timePickerModal;
                      updateOpenHours(day, field, time);
                      setTimePickerModal({ ...timePickerModal, visible: false });
                    }}
                    className={`w-[31%] py-3 mb-3 rounded-xl items-center border mr-[2%] ${
                      timePickerModal.day &&
                      openHours[timePickerModal.day]?.[timePickerModal.field] === time
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-bold text-xs ${
                        timePickerModal.day &&
                        openHours[timePickerModal.day]?.[timePickerModal.field] === time
                          ? 'text-purple-700'
                          : 'text-gray-700'
                      }`}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Image Cropper Modal (same as Registration screen) */}
      <CustomImageCropper
        visible={cropModal.visible}
        imageUri={cropModal.imageUri}
        aspectRatio={cropModal.type === 'logo' ? 1 : 16 / 9}
        onCancel={() => setCropModal({ visible: false, imageUri: null, type: null })}
        onCropComplete={handleCropComplete}
      />

      {/* ─── Full-Screen Preview Modal ─────────────────── */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(10,0,30,0.92)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={() => setPreviewModalVisible(false)}
            style={{
              position: 'absolute',
              top: 56,
              right: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 24,
              padding: 10,
              zIndex: 10,
            }}
            activeOpacity={0.8}
          >
            <Icon name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 24, paddingTop: 60 }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Icon name="phone-portrait-outline" size={16} color="#C4B5FD" />
              <Text style={{ color: '#C4B5FD', fontSize: 13, fontWeight: '700', marginLeft: 8 }}>
                USER HOME SCREEN — AS SEEN BY CUSTOMERS
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              This preview updates live as you edit your details
            </Text>
          </View>

          {/* Preview card */}
          <BusinessPreviewCard
            name={formData.name}
            category={formData.category}
            coverImageUri={images.coverImage?.uri || null}
            address={formData.address}
            isFullScreen
          />

          {/* Hint */}
          <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 11,
                textAlign: 'center',
                lineHeight: 17,
              }}
            >
              The cover image shown is exactly your cropped version.{`\n`}
              Changes will be visible to customers after you save.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setPreviewModalVisible(false)}
            style={{
              marginTop: 28,
              backgroundColor: '#5e399e',
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 16,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
