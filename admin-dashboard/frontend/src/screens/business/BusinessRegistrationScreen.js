import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Platform,
  Switch,
  Modal,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { registerBusiness } from '../../store/slices/businessSlice';
import PhoneInput from 'react-native-phone-number-input';
import AdvancedLocationPicker from '../../components/AdvancedLocationPicker';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';
import { parseBackendErrors, showErrorMessage } from '../../utils/errorHandler';
import ValidatedTextInput from '../../components/common/ValidatedTextInput';

const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_API_KEY ||
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
  Constants.expoConfig?.ios?.config?.googleMapsApiKey;

export default function BusinessRegistrationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.business);

  const [formData, setFormData] = useState({
    businessName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    buildingNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    landmark: '',
    description: '',
    website: '',
    tripAdvisorLink: '',
    googleBusinessName: '',
    category: ''
  });

  const [errors, setErrors] = useState({});

  const [images, setImages] = useState({
    logo: null,
    coverImage: null,
    gallery: [] // Gallery images array
  });
  const [uploadedImages, setUploadedImages] = useState({
    logo: null,
    coverImage: null,
    gallery: []
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({
    logo: false,
    coverImage: false,
    gallery: false
  });

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: '',
    loading: true,
    error: null
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Address search states
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [manualAddressDirty, setManualAddressDirty] = useState(false);
  const manualGeocodeTimeoutRef = useRef(null);

  // Categories from database (backend-managed)
  const [categories, setCategories] = useState([{ label: 'Select Category', value: '' }]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [openHours, setOpenHours] = useState({
    monday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    tuesday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    wednesday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    thursday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    friday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    saturday: { open: '09:00 AM', close: '05:00 PM', closed: false },
    sunday: { open: '09:00 AM', close: '05:00 PM', closed: true }
  });

  const [timePickerModal, setTimePickerModal] = useState({
    visible: false,
    day: null,
    field: null // 'open' or 'close'
  });

  const [applyToAll, setApplyToAll] = useState(false);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const businessPhoneInputRef = useRef(null);
  const [businessPhoneRawValue, setBusinessPhoneRawValue] = useState('');
  const [businessPhoneError, setBusinessPhoneError] = useState('');

  // Function to search for addresses using Google Places Autocomplete API
  const searchAddress = async (query) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      setSearchingAddress(true);

      if (!GOOGLE_API_KEY) {
        console.error('❌ Google API key not configured');
        Alert.alert('Configuration Error', 'Google API key is missing. Please contact support.');
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        return;
      }

      // Step 1: Get place predictions using Places Autocomplete API
      // Using location bias to UK instead of strict country filtering for better results
      // UK center coordinates: 54.7023545, -3.2765753
      const autocompleteResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:gb&types=establishment|geocode&key=${GOOGLE_API_KEY}`
      );

      if (!autocompleteResponse.ok) {
        console.error('Google Places API error:', autocompleteResponse.status);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        return;
      }

      const autocompleteData = await autocompleteResponse.json();

      if (autocompleteData.status !== 'OK' || !autocompleteData.predictions || autocompleteData.predictions.length === 0) {
        console.log(`ℹ️ Google Places API returned: ${autocompleteData.status}`);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
        return;
      }


      // Step 2: Get detailed information (lat/lng) for each prediction
      const detailedSuggestions = await Promise.all(
        autocompleteData.predictions.slice(0, 5).map(async (prediction) => {
          try {
            const placeDetailsResponse = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=formatted_address,geometry,address_component&key=${GOOGLE_API_KEY}`
            );

            const placeDetailsData = await placeDetailsResponse.json();

            if (placeDetailsData.status === 'OK' && placeDetailsData.result) {
              return {
                id: prediction.place_id,
                address: placeDetailsData.result.formatted_address || prediction.description,
                latitude: placeDetailsData.result.geometry.location.lat,
                longitude: placeDetailsData.result.geometry.location.lng,
                placeId: prediction.place_id,
                types: prediction.types || [],
                components: placeDetailsData.result.address_components || []
              };
            }
            return null;
          } catch (error) {
            console.error('Error fetching place details:', error);
            return null;
          }
        })
      );

      // Filter out null results
      const validSuggestions = detailedSuggestions.filter(s => s !== null);

      setAddressSuggestions(validSuggestions);
      setShowAddressSuggestions(validSuggestions.length > 0);

      if (validSuggestions.length > 0) {
        console.log(`✅ Found ${validSuggestions.length} accurate address suggestions`);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Debounce address search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (addressSearchQuery) {
        searchAddress(addressSearchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [addressSearchQuery]);

  const parseAddressComponents = (components = []) => {
    const getComponent = (types) => {
      const comp = components.find((c) => types.every((type) => c.types.includes(type)));
      return comp ? comp.long_name : '';
    };

    return {
      buildingNumber: getComponent(['street_number']),
      street: getComponent(['route']),
      city: getComponent(['postal_town']) || getComponent(['locality']),
      county: getComponent(['administrative_area_level_2']),
      postcode: getComponent(['postal_code']),
      country: getComponent(['country']),
    };
  };

  const updateFormWithAddressComponents = (components, formattedAddress) => {
    const parsed = parseAddressComponents(components);
    const updated = {
      ...formData,
      buildingNumber: parsed.buildingNumber || formData.buildingNumber,
      street: parsed.street || formData.street,
      city: parsed.city || formData.city,
      county: parsed.county || formData.county,
      postcode: parsed.postcode || formData.postcode,
      country: parsed.country || formData.country,
      address: formattedAddress || formData.address,
    };
    setFormData(updated);
    updateFullAddress(updated, false);
    setManualAddressDirty(false);
  };

  const geocodeManualAddress = async (addressPayload) => {
    if (!GOOGLE_API_KEY) return;

    const { buildingNumber, street, city, county, postcode } = addressPayload;
    if (!street || !city || !postcode) return;

    const query = [buildingNumber, street, city, county, postcode, 'United Kingdom']
      .filter(Boolean)
      .join(', ');

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query
        )}&components=country:GB&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length) {
        const coords = data.results[0].geometry.location;
        setLocation((prev) => ({
          ...prev,
          latitude: coords.lat,
          longitude: coords.lng,
          address: data.results[0].formatted_address,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Error geocoding manual address:', error);
    } finally {
      setManualAddressDirty(false);
    }
  };

  // Function to update full address from manual fields (UK format)
  const updateFullAddress = (data, shouldUpdateState = true) => {
    const parts = [];
    if (data.buildingNumber) parts.push(data.buildingNumber);
    if (data.street) parts.push(data.street);
    if (data.city) parts.push(data.city);
    if (data.county) parts.push(data.county);
    if (data.postcode) parts.push(data.postcode);
    if (data.country) parts.push(data.country);
    if (data.landmark) parts.push(`Near: ${data.landmark}`);

    const fullAddress = parts.join(', ');
    if (shouldUpdateState) {
      setFormData(prev => ({ ...prev, address: fullAddress }));
    }
    return fullAddress;
  };

  // Function to select address from suggestions
  const selectAddressSuggestion = (suggestion) => {
    let updatedForm = { ...formData, address: suggestion.address };
    if (suggestion.components) {
      const parsed = parseAddressComponents(suggestion.components);
      updatedForm = {
        ...updatedForm,
        buildingNumber: parsed.buildingNumber || updatedForm.buildingNumber,
        street: parsed.street || updatedForm.street,
        city: parsed.city || updatedForm.city,
        county: parsed.county || updatedForm.county,
        postcode: parsed.postcode || updatedForm.postcode,
        country: parsed.country || updatedForm.country,
      };
    }
    setFormData(updatedForm);
    updateFullAddress(updatedForm);
    setAddressSearchQuery(suggestion.address);
    setLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address,
      loading: false,
      error: null
    });
    setManualAddressDirty(false);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]); // Clear suggestions after selection
    console.log('✅ Address selected from search:', suggestion.address);
    console.log('📍 Location:', suggestion.latitude.toFixed(6), suggestion.longitude.toFixed(6));
  };

  // Function to get location
  const getLocation = useCallback(async () => {
    try {
      setLocation(prev => ({ ...prev, loading: true, error: null }));

      console.log('📍 Requesting location permission...');
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocation(prev => ({
          ...prev,
          loading: false,
          error: 'Location permission denied'
        }));
        Alert.alert(
          'Location Required',
          'This app needs location permission to register your business. Location is required for the geofencing feature (users can only review within 50 meters).',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: () => Location.requestForegroundPermissionsAsync().then(getLocation) }
          ]
        );
        return;
      }

      console.log('📍 Getting current location...');
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0
      });

      console.log('✅ Location obtained:', currentLocation.coords.latitude, currentLocation.coords.longitude);

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        loading: false,
        error: null
      });

      // Reverse geocode to get address
      const addressData = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });

      if (addressData && addressData.length > 0) {
        const addr = addressData[0];
        const fullAddress = `${addr.name || ''}, ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`.replace(/,\s*,/g, ',').trim();
        setFormData(prev => ({ ...prev, address: fullAddress }));
        setAddressSearchQuery(fullAddress);
        setLocation(prev => ({ ...prev, address: fullAddress }));
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please:\n\n1. Enable Location Services in device settings\n2. Make sure GPS is turned ON\n3. Try going outside or near a window\n\nGo to: Settings → Location → Turn ON',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: getLocation }
        ]
      );
    }
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (!manualAddressDirty) return;
    if (manualGeocodeTimeoutRef.current) {
      clearTimeout(manualGeocodeTimeoutRef.current);
    }
    manualGeocodeTimeoutRef.current = setTimeout(() => {
      geocodeManualAddress(formData);
    }, 1200);

    return () => {
      if (manualGeocodeTimeoutRef.current) {
        clearTimeout(manualGeocodeTimeoutRef.current);
      }
    };
  }, [formData.buildingNumber, formData.street, formData.city, formData.county, formData.postcode, manualAddressDirty]);

  // Fetch categories from database (admin-managed ONLY)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await ApiService.getCategories();

        if (response.success && response.categories) {
          const categoryOptions = [
            { label: 'Select Category', value: '' },
            ...response.categories.map(cat => ({
              label: cat.name,
              value: cat.value || cat.name.toLowerCase()
            }))
          ];
          setCategories(categoryOptions);
          console.log(`✅ Loaded ${response.categories.length} categories from database`);
        } else {
          // No categories found - admin needs to create them
          setCategories([{ label: 'No categories available', value: '' }]);
          Alert.alert(
            'Categories Not Available',
            'Admin has not created any categories yet. Please contact support.'
          );
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // API failed - show error, NO fallback categories
        setCategories([{ label: 'Error loading categories', value: '' }]);
        Alert.alert(
          'Error Loading Categories',
          'Failed to load categories from server. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => fetchCategories() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const timeSlots = [
    'Closed',
    '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
    '03:00 AM', '03:30 AM', '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM',
    '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
    '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: type !== 'gallery',
        aspect: type === 'logo' ? [1, 1] : type === 'coverImage' ? [16, 9] : undefined,
        quality: 0.8,
        allowsMultipleSelection: type === 'gallery'
      });

      if (!result.canceled) {
        if (type === 'gallery') {
          // For gallery, add multiple images
          setImages({ ...images, gallery: [...images.gallery, ...result.assets] });
        } else {
          // For logo and cover, single image
          setImages({ ...images, [type]: result.assets[0] });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeGalleryImage = (index) => {
    const newGallery = images.gallery.filter((_, i) => i !== index);
    setImages({ ...images, gallery: newGallery });
  };

  // Upload image to Cloudinary via backend
  const uploadImageToCloudinary = async (imageUri, imageType, businessId = null) => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const extension = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

      const fieldName = imageType === 'logo' ? 'logo' : imageType === 'coverImage' ? 'coverImage' : 'images';

      formData.append(fieldName, {
        uri: imageUri,
        name: filename,
        type: mimeType
      });

      let response;
      if (imageType === 'logo') {
        response = await ApiService.uploadBusinessLogo(formData, businessId);
      } else if (imageType === 'coverImage') {
        response = await ApiService.uploadBusinessCover(formData, businessId);
      } else {
        response = await ApiService.uploadBusinessGallery(formData, businessId);
      }

      if (response.success || response.data) {
        // Handle response format
        const data = response.data || response;

        // For gallery, response has images array
        if (imageType === 'gallery' && response.images && response.images.length > 0) {
          return response.images[0]; // Return first image from array
        }

        return {
          url: data.url || data.imageUrl,
          publicId: data.publicId || data.public_id
        };
      }
      throw new Error(response.message || 'Upload failed');
    } catch (error) {
      console.error(`Error uploading ${imageType}:`, error);
      throw error;
    }
  };

  // Upload multiple gallery images at once
  const uploadGalleryImages = async (galleryImages, businessId = null) => {
    if (!galleryImages || galleryImages.length === 0) return [];

    try {
      const formData = new FormData();

      // Append all gallery images to formData
      galleryImages.forEach((img, index) => {
        const filename = img.uri.split('/').pop() || `gallery_${Date.now()}_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const extension = match ? match[1].toLowerCase() : 'jpg';
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

        formData.append('images', {
          uri: img.uri,
          name: filename,
          type: mimeType
        });
      });

      const response = await ApiService.uploadBusinessGallery(formData, businessId);

      if (response.success && response.images && response.images.length > 0) {
        return response.images.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          originalUri: galleryImages[index]?.uri // Store original URI for matching
        }));
      }

      throw new Error(response.message || 'Gallery upload failed');
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      throw error;
    }
  };

  const updateOpenHours = (day, field, value) => {
    if (applyToAll) {
      const newOpenHours = {};
      Object.keys(openHours).forEach(d => {
        newOpenHours[d] = {
          ...openHours[d],
          [field]: value
        };
      });
      setOpenHours(newOpenHours);
    } else {
      setOpenHours({
        ...openHours,
        [day]: {
          ...openHours[day],
          [field]: value
        }
      });
    }
  };

  const toggleDayClosed = (day) => {
    const isNowClosed = !openHours[day].closed;

    if (applyToAll) {
      const newOpenHours = {};
      Object.keys(openHours).forEach(d => {
        newOpenHours[d] = {
          ...openHours[d],
          closed: isNowClosed
        };
      });
      setOpenHours(newOpenHours);
    } else {
      setOpenHours({
        ...openHours,
        [day]: {
          ...openHours[day],
          closed: isNowClosed
        }
      });
    }
  };

  const openTimePicker = (day, field) => {
    setTimePickerModal({
      visible: true,
      day,
      field
    });
  };

  const handleTimeSelect = (time) => {
    const { day, field } = timePickerModal;
    updateOpenHours(day, field, time);
    setTimePickerModal({ ...timePickerModal, visible: false });
  };

  const validateForm = () => {
    if (!formData.businessName || !formData.businessName.trim()) {
      showErrorMessage('Please enter business name');
      return false;
    }
    if (!formData.firstName || !formData.firstName.trim()) {
      showErrorMessage('Please enter first name');
      return false;
    }
    if (!formData.lastName || !formData.lastName.trim()) {
      showErrorMessage('Please enter last name');
      return false;
    }
    if (!formData.email || !formData.email.trim()) {
      showErrorMessage('Please enter email address');
      return false;
    }
    if (!formData.email.includes('@')) {
      showErrorMessage('Please enter a valid email address');
      return false;
    }
    const isPhoneValid = businessPhoneInputRef.current?.isValidNumber(businessPhoneRawValue);
    if (!isPhoneValid) {
      setBusinessPhoneError('Please enter a valid phone number with country code');
      showErrorMessage('Please enter a valid phone number with country code');
      return false;
    }
    const phoneLength = businessPhoneRawValue.replace(/\D/g, '').length;
    if (phoneLength < 7 || phoneLength > 15) {
      showErrorMessage('Please enter a valid phone number with country code');
      return false;
    }
    setBusinessPhoneError('');

    // Validate required address fields for business registration
    if (!formData.street || !formData.street.trim()) {
      showErrorMessage('Please enter street name');
      return false;
    }
    if (!formData.city || !formData.city.trim()) {
      showErrorMessage('Please enter town/city');
      return false;
    }
    if (!formData.postcode || !formData.postcode.trim()) {
      showErrorMessage('Please enter postcode');
      return false;
    }

    if (!formData.category) {
      showErrorMessage('Please select business category');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!location.latitude || !location.longitude) {
      Alert.alert(
        'Location Required',
        'Business location is required for geofencing. Please enable location services and restart the app.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    try {
      setUploading(true);

      // Register business FIRST (without blocking on image uploads)
      // Images will be uploaded after registration in the background
      const businessData = {
        name: formData.businessName?.trim() || '',
        ownerName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
        email: formData.email?.trim() || '',
        // Phone in E.164 format (e.g., +447123456789) - no spaces for backend validation
        phone: (() => {
          const phoneNumber = businessPhoneInputRef.current?.getNumberAfterPossiblyEliminatingZero();
          if (phoneNumber && typeof phoneNumber === 'string') {
            return phoneNumber.replace(/\s/g, '');
          }
          return formData.phone?.replace(/\s/g, '') || '';
        })(),
        address: formData.address?.trim() || '',
        // UK Address fields
        buildingNumber: formData.buildingNumber?.trim() || '',
        street: formData.street?.trim() || '',
        city: formData.city?.trim() || '',
        county: formData.county?.trim() || '',
        postcode: formData.postcode?.trim().toUpperCase() || '',
        country: formData.country || 'United Kingdom',
        landmark: formData.landmark?.trim() || '',
        category: formData.category || '',
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        // Optional fields - only include if they have values
        ...(formData.description?.trim() && { description: formData.description.trim() }),
        ...(formData.website?.trim() && { website: formData.website.trim() }),
        ...(formData.tripAdvisorLink?.trim() && { tripAdvisorLink: formData.tripAdvisorLink.trim() }),
        ...(formData.googleBusinessName?.trim() && { googleBusinessName: formData.googleBusinessName.trim() }),
        ...(openHours && Object.keys(openHours).length > 0 && { openingHours: openHours }),
        // Images will be null initially, uploaded later
        logo: null,
        logoPublicId: null,
        coverImage: null,
        coverImagePublicId: null,
        images: []
      };

      console.log('📝 Submitting business registration (images will be uploaded separately)...');
      const result = await dispatch(registerBusiness(businessData)).unwrap();

      console.log('✅ Registration successful:', result);
      const businessId = result.business._id;

      // Upload images AFTER registration (non-blocking, with timeout)
      if (images.logo || images.coverImage || (images.gallery && images.gallery.length > 0)) {
        console.log('📸 Starting background image uploads...');

        // Track upload failures to notify user
        const uploadFailures = [];

        // Upload images in parallel with timeout
        const uploadPromises = [];

        // Upload logo with timeout
        if (images.logo) {
          uploadPromises.push(
            Promise.race([
              uploadImageToCloudinary(images.logo.uri, 'logo', businessId).then(logoData => {
                console.log('✅ Logo uploaded:', logoData.url);
                // Update business with logo
                return ApiService.updateBusinessImages(businessId, {
                  logo: logoData.url,
                  logoPublicId: logoData.publicId
                }).catch(err => {
                  console.error('Failed to update logo:', err);
                  uploadFailures.push('Logo');
                });
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Logo upload timeout')), 30000))
            ]).catch(error => {
              console.error('⚠️ Logo upload failed or timed out:', error.message);
              setUploadStatus(prev => ({ ...prev, logo: false }));
              uploadFailures.push('Logo');
            })
          );
        }

        // Upload cover image with timeout
        if (images.coverImage) {
          uploadPromises.push(
            Promise.race([
              uploadImageToCloudinary(images.coverImage.uri, 'coverImage', businessId).then(coverData => {
                console.log('✅ Cover image uploaded:', coverData.url);
                // Update business with cover image
                return ApiService.updateBusinessImages(businessId, {
                  coverImage: coverData.url,
                  coverImagePublicId: coverData.publicId
                }).catch(err => {
                  console.error('Failed to update cover image:', err);
                  uploadFailures.push('Cover Image');
                });
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Cover upload timeout')), 30000))
            ]).catch(error => {
              console.error('⚠️ Cover image upload failed or timed out:', error.message);
              setUploadStatus(prev => ({ ...prev, coverImage: false }));
              uploadFailures.push('Cover Image');
            })
          );
        }

        // Upload gallery images with timeout
        if (images.gallery && images.gallery.length > 0) {
          uploadPromises.push(
            Promise.race([
              uploadGalleryImages(images.gallery, businessId).then(uploadedGallery => {
                console.log(`✅ Gallery images uploaded: ${uploadedGallery.length} images`);
                // Update business with gallery images
                const galleryUrls = uploadedGallery.map(img => ({
                  url: img.url,
                  publicId: img.publicId
                }));
                return ApiService.updateBusinessImages(businessId, {
                  images: galleryUrls
                }).catch(err => {
                  console.error('Failed to update gallery images:', err);
                  uploadFailures.push('Gallery Images');
                });
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Gallery upload timeout')), 60000))
            ]).catch(error => {
              console.error('⚠️ Gallery upload failed or timed out:', error.message);
              setUploadStatus(prev => ({ ...prev, gallery: false }));
              uploadFailures.push('Gallery Images');
            })
          );
        }

        // Wait for all uploads and notify user of any failures
        Promise.allSettled(uploadPromises).then(() => {
          console.log('📸 All image uploads completed');

          // Notify user if any uploads failed
          if (uploadFailures.length > 0) {
            const failedItems = uploadFailures.join(', ');
            Alert.alert(
              'Image Upload Issues',
              `Your business was registered successfully, but the following images failed to upload:\n\n${failedItems}\n\nYou can add them later from your Business Dashboard.`,
              [{ text: 'OK' }]
            );
          }
        });
      }

      // Navigate immediately (don't wait for image uploads)
      // Navigate to KYC screen for verification
      setTimeout(() => {
        navigation.navigate('BusinessKYC', { businessId });
      }, 100);

    } catch (error) {
      console.error('❌ Registration failed:', error);

      const { fieldErrors } = parseBackendErrors(error);
      setErrors(fieldErrors);

      // Show detailed validation errors using flash message
      showErrorMessage(error, { title: 'Registration Failed' });

    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        className="pt-12 pb-6 px-6"
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Business Registration</Text>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>

        {/* Location Status */}
        <View className="mb-4 bg-blue-50 rounded-xl p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {location.loading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text className="ml-3 text-blue-700">Getting location...</Text>
                </>
              ) : location.error ? (
                <>
                  <Icon name="alert-circle" size={20} color="#DC2626" />
                  <Text className="ml-3 text-red-600 flex-1">Location Error</Text>
                </>
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="#10B981" />
                  <Text className="ml-3 text-green-700 flex-1">Location detected ✓</Text>
                </>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              className="ml-2"
            >
              <Icon name="map" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {location.latitude && location.longitude && (
            <Text className="mt-1 text-xs text-gray-500">
              Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
            </Text>
          )}

          {location.error && (
            <View className="mt-3 flex-row">
              <TouchableOpacity
                onPress={getLocation}
                className="bg-red-500 rounded-lg py-2 px-4 items-center flex-1 mr-2"
              >
                <Text className="text-white font-semibold">Retry Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                className="bg-blue-500 rounded-lg py-2 px-4 items-center flex-1 ml-2"
              >
                <Text className="text-white font-semibold">Pick Manually</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Business Name */}
        <View className="mb-5">
          <Text className="text-gray-800 font-bold mb-2 text-base">Business Name *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-4 text-gray-900 border border-gray-300 shadow-sm"
            placeholder="e.g., The Coffee House"
            placeholderTextColor="#9CA3AF"
            value={formData.businessName}
            onChangeText={(value) => handleInputChange('businessName', value)}
            style={{ fontSize: 15, fontWeight: '500' }}
          />
        </View>

        {/* First Name & Last Name */}
        <View className="flex-row mb-5">
          <View className="flex-1 mr-2">
            <Text className="text-gray-800 font-bold mb-2 text-base">First Name *</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-4 text-gray-900 border border-gray-300 shadow-sm"
              placeholder="John"
              placeholderTextColor="#9CA3AF"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              style={{ fontSize: 15, fontWeight: '500' }}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-gray-800 font-bold mb-2 text-base">Last Name *</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-4 text-gray-900 border border-gray-300 shadow-sm"
              placeholder="Smith"
              placeholderTextColor="#9CA3AF"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              style={{ fontSize: 15, fontWeight: '500' }}
            />
          </View>
        </View>

        {/* Email */}
        <View className="mb-5">
          <Text className="text-gray-800 font-bold mb-2 text-base">Email Address *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-4 text-gray-900 border border-gray-300 shadow-sm"
            placeholder="john.smith@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            style={{ fontSize: 15, fontWeight: '500' }}
          />
        </View>

        {/* Phone Number */}
        <View className="mb-5">
          <Text className="text-gray-800 font-bold mb-2 text-base">Phone Number *</Text>
          <PhoneInput
            ref={businessPhoneInputRef}
            defaultCode="GB"
            layout="first"
            defaultValue={businessPhoneRawValue}
            value={businessPhoneRawValue}
            onChangeText={(text) => {
              setBusinessPhoneRawValue(text);
              if (businessPhoneError) setBusinessPhoneError('');
            }}
            onChangeFormattedText={(text) => {
              handleInputChange('phone', text);
            }}
            textInputProps={{
              placeholder: 'Enter phone number',
              placeholderTextColor: '#9CA3AF',
            }}
            containerStyle={{
              width: '100%',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: businessPhoneError ? '#EF4444' : '#D1D5DB',
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
            textContainerStyle={{
              backgroundColor: 'transparent',
              borderTopRightRadius: 12,
              borderBottomRightRadius: 12,
            }}
            textInputStyle={{ color: '#111827', fontSize: 15, fontWeight: '500', paddingVertical: 4 }}
            codeTextStyle={{ color: '#111827', fontWeight: '600' }}
          />
          {businessPhoneError ? (
            <Text className="text-red-500 text-xs mt-1">{businessPhoneError}</Text>
          ) : null}
        </View>

        {/* Manual Address Entry Fields - UK Format */}
        <View className="mb-5">
          <Text className="text-gray-800 font-bold mb-3 text-lg">📍 Business Address</Text>

          {/* Search Address */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2 text-sm">🔍 Search Address</Text>
            <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-4 py-3 shadow-sm">
              <Icon name="search" size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="e.g., Quay Hotel & Spa, Deganwy"
                placeholderTextColor="#9CA3AF"
                value={addressSearchQuery}
                onChangeText={(value) => setAddressSearchQuery(value)}
                autoCapitalize="words"
                style={{ fontSize: 15, fontWeight: '500' }}
              />
              {searchingAddress && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>
            {showAddressSuggestions && addressSuggestions.length > 0 && (
              <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                {addressSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    className="flex-row items-start px-3 py-2 border-b border-gray-100"
                    onPress={() => selectAddressSuggestion(suggestion)}
                  >
                    <Icon name="location-outline" size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
                    <Text className="flex-1 ml-2 text-gray-800">{suggestion.address}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Building Number & Street Name */}
          <View className="flex-row mb-3">
            <View className="w-28 mr-2">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Building</Text>
              <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
                <TextInput
                  className="flex-1 text-gray-900 text-center"
                  placeholder="12A"
                  placeholderTextColor="#9CA3AF"
                  value={formData.buildingNumber || ''}
                  onChangeText={(value) => {
                    const updated = { ...formData, buildingNumber: value };
                    setFormData(updated);
                    updateFullAddress(updated);
                    setManualAddressDirty(true);
                  }}
                  style={{ fontSize: 15, fontWeight: '500' }}
                />
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Street Name *</Text>
              <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
                <Icon name="business" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="High Street"
                  placeholderTextColor="#9CA3AF"
                  value={formData.street || ''}
                  onChangeText={(value) => {
                    const updated = { ...formData, street: value };
                    setFormData(updated);
                    updateFullAddress(updated);
                    setManualAddressDirty(true);
                  }}
                  style={{ fontSize: 15, fontWeight: '500' }}
                />
              </View>
            </View>
          </View>

          {/* Town/City */}
          <View className="mb-3">
            <Text className="text-gray-700 font-semibold mb-2 text-sm">Town/City *</Text>
            <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
              <Icon name="home" size={18} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="London"
                placeholderTextColor="#9CA3AF"
                value={formData.city || ''}
                onChangeText={(value) => {
                  const updated = { ...formData, city: value };
                  setFormData(updated);
                  updateFullAddress(updated);
                  setManualAddressDirty(true);
                }}
                style={{ fontSize: 15, fontWeight: '500' }}
              />
            </View>
          </View>

          {/* County & Postcode in Row */}
          <View className="flex-row mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">County</Text>
              <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
                <Icon name="flag" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-2 text-gray-900"
                  placeholder="Greater London"
                  placeholderTextColor="#9CA3AF"
                  value={formData.county || ''}
                  onChangeText={(value) => {
                    const updated = { ...formData, county: value };
                    setFormData(updated);
                    updateFullAddress(updated);
                    setManualAddressDirty(true);
                  }}
                  style={{ fontSize: 15, fontWeight: '500' }}
                />
              </View>
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-gray-700 font-semibold mb-2 text-sm">Postcode *</Text>
              <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
                <Icon name="mail" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-2 text-gray-900"
                  placeholder="SW1A 1AA"
                  placeholderTextColor="#9CA3AF"
                  value={formData.postcode || ''}
                  onChangeText={(value) => {
                    const formatted = value.toUpperCase();
                    const updated = { ...formData, postcode: formatted };
                    setFormData(updated);
                    updateFullAddress(updated);
                    setManualAddressDirty(true);
                  }}
                  autoCapitalize="characters"
                  maxLength={8}
                  style={{ fontSize: 15, fontWeight: '600' }}
                />
              </View>
            </View>
          </View>

          {/* Country (Read-only) */}
          <View className="mb-3">
            <Text className="text-gray-700 font-semibold mb-2 text-sm">Country</Text>
            <View className="bg-gray-100 rounded-xl border border-gray-300 flex-row items-center px-3 py-3">
              <Icon name="globe" size={18} color="#6B7280" />
              <Text className="flex-1 ml-3 text-gray-900 font-bold" style={{ fontSize: 15 }}>
                🇬🇧 United Kingdom
              </Text>
            </View>
          </View>

          {/* Landmark (Optional) */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2 text-sm">Landmark (Optional)</Text>
            <View className="bg-white rounded-xl border border-gray-300 flex-row items-center px-3 py-3 shadow-sm">
              <Icon name="navigate" size={18} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Near Tesco, Opposite Post Office"
                placeholderTextColor="#9CA3AF"
                value={formData.landmark || ''}
                onChangeText={(value) => {
                  setFormData({ ...formData, landmark: value });
                  updateFullAddress({ ...formData, landmark: value });
                }}
                style={{ fontSize: 15, fontWeight: '500' }}
              />
            </View>
          </View>

          {/* Map Picker Button */}
          <View className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
            <View className="flex-row items-center mb-3">
              <Icon name="pin" size={24} color={COLORS.secondary} />
              <Text className="flex-1 ml-2 text-gray-700 font-semibold">Set Exact Location</Text>
            </View>
            <Text className="text-gray-600 text-xs mb-3">
              Click below to pick your exact business location on the map and get coordinates
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              activeOpacity={0.7}
              style={{ backgroundColor: COLORS.secondary }}
              className="rounded-lg py-4 items-center"
            >
              <View className="flex-row items-center">
                <Icon name="map" size={24} color="#FFF" />
                <Text className="font-bold text-white ml-2 text-base">
                  📍 Open Map Picker
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Selected Location Display */}
          {location.latitude && location.longitude && (
            <View className="bg-green-50 rounded-xl p-4 border-2 border-green-300 mt-2">
              <View className="flex-row items-center mb-2">
                <View className="bg-green-500 rounded-full p-2">
                  <Icon name="checkmark-circle" size={24} color="#FFF" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-green-800 font-bold text-base">
                    Location Confirmed ✓
                  </Text>
                  <Text className="text-green-600 text-xs">
                    Your business location is set
                  </Text>
                </View>
              </View>
              {formData.address && (
                <View className="bg-white rounded-lg p-2 mt-2">
                  <Text className="text-gray-900 text-xs font-medium mb-1">
                    📍 Address:
                  </Text>
                  <Text className="text-gray-700 text-xs">
                    {formData.address}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center mt-2 bg-white rounded-lg p-2">
                <Icon name="location" size={16} color="#10B981" />
                <Text className="text-gray-600 text-xs ml-2">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Business Description */}
        {/* Business Description */}
        <ValidatedTextInput
          label="Business Description"
          fieldName="description"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          numberOfLines={4}
          showCounter
          maxLength={500}
          required
          hint="Describe your business, services, and amenities"
          placeholder="Tell customers about your business..."
          error={errors.description}
        />

        {/* Logo Upload */}
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-800 font-bold text-base">📷 Business Logo</Text>
            {uploadedImages.logo && (
              <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full">
                <Icon name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-700 text-xs font-semibold ml-1">Uploaded</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => pickImage('logo')}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 py-12 items-center justify-center relative"
            disabled={uploading}
          >
            {images.logo ? (
              <View className="items-center">
                <Image
                  source={{ uri: images.logo.uri }}
                  className="w-24 h-24 rounded-lg"
                  resizeMode="cover"
                />
                {uploadedImages.logo && (
                  <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <Icon name="checkmark" size={16} color="#FFF" />
                  </View>
                )}
                {uploadStatus.logo && !uploadedImages.logo && (
                  <View className="absolute top-2 right-2">
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                )}
              </View>
            ) : (
              <>
                <Icon name="image-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2">Select File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Business Cover Image */}
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-800 font-bold text-base">🖼️ Cover Image</Text>
            {uploadedImages.coverImage && (
              <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full">
                <Icon name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-700 text-xs font-semibold ml-1">Uploaded</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => pickImage('coverImage')}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 py-12 items-center justify-center relative"
            disabled={uploading}
          >
            {images.coverImage ? (
              <View className="w-full relative">
                <Image
                  source={{ uri: images.coverImage.uri }}
                  className="w-full h-32 rounded-lg"
                  resizeMode="cover"
                />
                {uploadedImages.coverImage && (
                  <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <Icon name="checkmark" size={16} color="#FFF" />
                  </View>
                )}
                {uploadStatus.coverImage && !uploadedImages.coverImage && (
                  <View className="absolute top-2 right-2 bg-white rounded-full p-1">
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                )}
              </View>
            ) : (
              <>
                <Icon name="image-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 mt-2">Select File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Business Gallery Images */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-900 font-semibold">Business Gallery Images</Text>
            <View className="flex-row items-center">
              {uploadedImages.gallery.length > 0 && (
                <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full mr-2">
                  <Icon name="checkmark-circle" size={16} color="#10B981" />
                  <Text className="text-green-700 text-xs font-semibold ml-1">
                    {uploadedImages.gallery.length} Uploaded
                  </Text>
                </View>
              )}
              <Text className="text-xs text-gray-500">Optional</Text>
            </View>
          </View>

          {/* Gallery Images Grid */}
          {images.gallery.length > 0 && (
            <View className="flex-row flex-wrap mb-3">
              {images.gallery.map((img, index) => {
                const isUploaded = uploadedImages.gallery.some(uploaded => uploaded.url === img.uri || uploaded.originalUri === img.uri);
                const isUploading = uploadStatus.gallery && !isUploaded;

                return (
                  <View key={index} className="relative mr-2 mb-2">
                    <Image
                      source={{ uri: img.uri }}
                      className="w-20 h-20 rounded-lg"
                      resizeMode="cover"
                    />
                    {isUploaded && (
                      <View className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                        <Icon name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                    {isUploading && (
                      <View className="absolute inset-0 bg-black/30 rounded-lg items-center justify-center">
                        <ActivityIndicator size="small" color="#FFF" />
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
          >
            <Icon name="images-outline" size={32} color="#D1D5DB" />
            <Text className="text-gray-500 mt-2">
              {images.gallery.length > 0 ? `Add More Images (${images.gallery.length} selected)` : 'Add Gallery Images'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Website */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">Website</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            placeholder="www.yourbusiness.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="url"
            autoCapitalize="none"
            value={formData.website}
            onChangeText={(value) => handleInputChange('website', value)}
          />
        </View>

        {/* TripAdvisor Profile Link */}
        <View className="mb-4">
          <Text className="text-gray-900 font-semibold mb-2">TripAdvisor Profile Link (Optional)</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            placeholder="https://www.tripadvisor.com/Restaurant_Review..."
            placeholderTextColor="#9CA3AF"
            keyboardType="url"
            autoCapitalize="none"
            value={formData.tripAdvisorLink}
            onChangeText={(value) => handleInputChange('tripAdvisorLink', value)}
          />
        </View>

        {/* Google Business Name */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-900 font-semibold">Google Business Name *</Text>
            <Text className="text-xs text-gray-500">Required for ratings</Text>
          </View>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200"
            placeholder="e.g., My Restaurant, New York"
            placeholderTextColor="#9CA3AF"
            value={formData.googleBusinessName}
            onChangeText={(value) => handleInputChange('googleBusinessName', value)}
          />
          <Text className="text-xs text-gray-400 mt-1 ml-1">
            Enter your exact Google Business name (same as on Google Maps). Not a URL link.
          </Text>
        </View>

        {/* Open Hours Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4 px-1">
            <View>
              <Text className="text-lg font-bold text-gray-900">Open Hours</Text>
              <Text className="text-xs text-gray-500">Set your weekly schedule</Text>
            </View>
            <TouchableOpacity
              onPress={() => setApplyToAll(!applyToAll)}
              activeOpacity={0.7}
              className={`flex-row items-center px-3 py-1.5 rounded-full border ${applyToAll ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
            >
              <Text className={`text-[10px] font-bold mr-2 ${applyToAll ? 'text-blue-600' : 'text-gray-500'}`}>
                APPLY TO ALL
              </Text>
              <Switch
                value={applyToAll}
                onValueChange={setApplyToAll}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={applyToAll ? '#2563EB' : '#F3F4F6'}
                ios_backgroundColor="#D1D5DB"
                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
              />
            </TouchableOpacity>
          </View>

          {Object.keys(openHours).map((day) => (
            <View key={day} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-2 ${openHours[day].closed ? 'bg-red-400' : 'bg-green-400'}`} />
                  <Text className="text-gray-900 font-bold capitalize text-base">{day}</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className={`text-[10px] mr-2 font-bold ${openHours[day].closed ? 'text-red-500' : 'text-green-600'}`}>
                    {openHours[day].closed ? 'CLOSED' : 'OPEN'}
                  </Text>
                  <Switch
                    value={!openHours[day].closed}
                    onValueChange={() => toggleDayClosed(day)}
                    trackColor={{ false: '#FECACA', true: '#A7F3D0' }}
                    thumbColor={!openHours[day].closed ? '#10B981' : '#EF4444'}
                    ios_backgroundColor="#FECACA"
                    style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                  />
                </View>
              </View>

              {!openHours[day].closed && (
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => openTimePicker(day, 'open')}
                    activeOpacity={0.7}
                    className="flex-1 bg-gray-50 rounded-xl py-3 px-4 border border-gray-100 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Opens At</Text>
                      <Text className="text-gray-900 font-bold">{openHours[day].open}</Text>
                    </View>
                    <Icon name="time-outline" size={18} color={COLORS.secondary} />
                  </TouchableOpacity>

                  <View className="w-10 items-center justify-center">
                    <View className="w-4 h-[1px] bg-gray-200" />
                  </View>

                  <TouchableOpacity
                    onPress={() => openTimePicker(day, 'close')}
                    activeOpacity={0.7}
                    className="flex-1 bg-gray-50 rounded-xl py-3 px-4 border border-gray-100 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Closes At</Text>
                      <Text className="text-gray-900 font-bold">{openHours[day].close}</Text>
                    </View>
                    <Icon name="time-outline" size={18} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Business Category Section */}
        <View className="mb-8">
          <Text className="text-lg font-bold text-gray-900 mb-3 ml-1">Business Category</Text>
          {loadingCategories ? (
            <View className="bg-gray-50 rounded-2xl border border-gray-100 py-6 items-center shadow-sm">
              <ActivityIndicator size="small" color={COLORS.secondary} />
              <Text className="text-gray-500 text-xs mt-3 font-medium">Loading categories...</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
              className="bg-white rounded-2xl py-4 px-5 border border-gray-100 flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-50 p-2 rounded-lg mr-4">
                  <Icon name="pricetags-outline" size={20} color={COLORS.secondary} />
                </View>
                <View>
                  <Text className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Category</Text>
                  <Text className={`text-base font-bold ${formData.category ? 'text-gray-900' : 'text-gray-400'}`}>
                    {categories.find(c => c.value === formData.category)?.label || 'Select Category'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-down-outline" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || uploading}
          activeOpacity={0.8}
          className="mb-8"
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            className="rounded-xl py-4 items-center"
          >
            {(loading || uploading) ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFF" size="small" />
                <Text className="text-white font-bold text-lg ml-3">
                  {uploading ? 'Uploading Images...' : 'Creating Business...'}
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-lg">Create Business</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTimePickerModal({ ...timePickerModal, visible: false })}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={() => setTimePickerModal({ ...timePickerModal, visible: false })}
        >
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl" style={{ maxHeight: '75%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900 capitalize">
                  {timePickerModal.day}
                </Text>
                <Text className="text-sm text-gray-500">
                  Select {timePickerModal.field === 'open' ? 'opening' : 'closing'} time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTimePickerModal({ ...timePickerModal, visible: false })}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="flex-row flex-wrap justify-between">
                {timeSlots.filter(t => t !== 'Closed').map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => handleTimeSelect(time)}
                    className={`w-[31%] py-3 mb-3 rounded-xl items-center border ${openHours[timePickerModal.day]?.[timePickerModal.field] === time
                      ? 'bg-blue-50 border-blue-600 shadow-sm'
                      : 'bg-white border-gray-100'
                      }`}
                  >
                    <Text className={`font-bold text-xs ${openHours[timePickerModal.day]?.[timePickerModal.field] === time
                      ? 'text-blue-700'
                      : 'text-gray-900'
                      }`}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setTimePickerModal({ ...timePickerModal, visible: false })}
              className="bg-gray-900 py-4 rounded-xl items-center mt-2"
            >
              <Text className="text-white font-bold text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 justify-end"
          onPress={() => setCategoryModalVisible(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 shadow-2xl" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-bold text-gray-900">Select Category</Text>
                <Text className="text-sm text-gray-500">Pick the best category for your business</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <View className="space-y-3">
                {categories.filter(c => c.value !== '').map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => {
                      handleInputChange('category', cat.value);
                      setCategoryModalVisible(false);
                    }}
                    className={`py-4 px-5 rounded-2xl flex-row items-center justify-between border ${formData.category === cat.value
                      ? 'bg-blue-50 border-blue-600 shadow-sm'
                      : 'bg-white border-gray-100'
                      }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`p-2 rounded-lg mr-4 ${formData.category === cat.value ? 'bg-blue-100' : 'bg-gray-50'
                        }`}>
                        <Icon name="pricetag-outline" size={20} color={formData.category === cat.value ? COLORS.secondary : '#9CA3AF'} />
                      </View>
                      <Text className={`font-bold text-base ${formData.category === cat.value ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                        {cat.label}
                      </Text>
                    </View>
                    {formData.category === cat.value && (
                      <Icon name="checkmark-circle" size={24} color={COLORS.secondary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setCategoryModalVisible(false)}
              className="bg-gray-900 py-4 rounded-xl items-center mt-2"
            >
              <Text className="text-white font-bold text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <AdvancedLocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(selectedLocation) => {
          setLocation({
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            address: selectedLocation.address,
            loading: false,
            error: null
          });

          if (selectedLocation.addressComponents) {
            const { buildingNumber, street, city, county, postcode, country } = selectedLocation.addressComponents;
            setFormData(prev => ({
              ...prev,
              address: selectedLocation.address,
              buildingNumber: buildingNumber || prev.buildingNumber,
              street: street || prev.street,
              city: city || prev.city,
              county: county || prev.county,
              postcode: postcode || prev.postcode,
              country: country || prev.country
            }));
          } else {
            setFormData(prev => ({ ...prev, address: selectedLocation.address }));
          }

          setAddressSearchQuery(selectedLocation.address);
          console.log('✅ Location selected:', selectedLocation);
        }}
        initialLocation={location}
        googleApiKey={GOOGLE_API_KEY}
      />
    </View>
  );
}
