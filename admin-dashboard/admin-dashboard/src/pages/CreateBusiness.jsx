import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, MapPin, Search, Clock, Image, X,
  ChevronDown, Check, Building2, Phone, Mail, User, Globe,
  Facebook, Instagram, Twitter, ExternalLink, Plus, Loader2
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import LocationPicker from '../components/LocationPicker';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

const DEFAULT_OPENING_HOURS = {
  monday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  tuesday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  wednesday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  thursday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  friday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  saturday: { open: '09:00 AM', close: '05:00 PM', closed: false },
  sunday: { open: '09:00 AM', close: '05:00 PM', closed: true }
};

const TIME_SLOTS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
  '03:00 AM', '03:30 AM', '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM',
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const CreateBusiness = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Owner info toggle
  const [includeOwnerInfo, setIncludeOwnerInfo] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Business Info
    name: '',
    description: '',
    category: '',

    // Owner Info (optional)
    firstName: '',
    lastName: '',
    email: '',
    phone: '',

    // UK Format Address
    buildingNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    landmark: '',

    // Location
    latitude: '',
    longitude: '',
    radius: 50,

    // External Links
    website: '',
    tripAdvisorUrl: '',
    googleBusinessName: '',
    facebook: '',
    instagram: '',
    twitter: '',

    // Status
    status: 'active',
    kycStatus: 'approved'
  });

  // Opening hours
  const [openingHours, setOpeningHours] = useState(DEFAULT_OPENING_HOURS);
  const [applyToAll, setApplyToAll] = useState(false);

  // Address search
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Images
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // Time picker modal
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTimeField, setSelectedTimeField] = useState(null);

  // Location picker modal
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await adminApi.getAllCategories();
        if (response.data?.categories) {
          setCategories(response.data.categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback categories
        setCategories([
          { _id: '1', name: 'Restaurant', value: 'restaurant' },
          { _id: '2', name: 'Cafe', value: 'cafe' },
          { _id: '3', name: 'Retail', value: 'retail' },
          { _id: '4', name: 'Services', value: 'services' },
          { _id: '5', name: 'Hotel', value: 'hotel' },
          { _id: '6', name: 'Salon', value: 'salon' },
          { _id: '7', name: 'Gym', value: 'gym' },
          { _id: '8', name: 'Healthcare', value: 'healthcare' },
          { _id: '9', name: 'Other', value: 'other' }
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Google Maps services refs
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const dummyDivRef = useRef(null);

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initPlacesServices();
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkLoaded);
            initPlacesServices();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initPlacesServices();
      document.head.appendChild(script);
    };

    const initPlacesServices = () => {
      // Create a dummy div for PlacesService (required)
      if (!dummyDivRef.current) {
        dummyDivRef.current = document.createElement('div');
      }
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDivRef.current);
    };

    loadGoogleMaps();
  }, []);

  // Address search with Google Places AutocompleteService
  const searchAddress = useCallback((query) => {
    if (!query || query.trim().length < 3 || !autocompleteServiceRef.current) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingAddress(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'gb' },
        types: ['establishment', 'geocode']
      },
      (predictions, status) => {
        setSearchingAddress(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Store predictions with place_id for later lookup
          setAddressSuggestions(predictions.slice(0, 5).map(pred => ({
            id: pred.place_id,
            description: pred.description,
            place_id: pred.place_id
          })));
          setShowSuggestions(true);
        } else {
          setAddressSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  }, []);

  // Debounced address search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (addressQuery) {
        searchAddress(addressQuery);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [addressQuery, searchAddress]);

  // Parse address components
  const parseAddressComponents = (components) => {
    const getComponent = (types) => {
      const comp = components.find(c => types.every(t => c.types.includes(t)));
      return comp ? comp.long_name : '';
    };

    return {
      buildingNumber: getComponent(['street_number']),
      street: getComponent(['route']),
      city: getComponent(['postal_town']) || getComponent(['locality']),
      county: getComponent(['administrative_area_level_2']),
      postcode: getComponent(['postal_code']),
      country: getComponent(['country']) || 'United Kingdom'
    };
  };

  // Select address from suggestions - uses PlacesService to get details
  const selectAddress = (suggestion) => {
    if (!placesServiceRef.current || !suggestion.place_id) {
      console.error('PlacesService not available or no place_id');
      return;
    }

    setSearchingAddress(true);

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['formatted_address', 'geometry', 'address_components']
      },
      (place, status) => {
        setSearchingAddress(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const parsed = parseAddressComponents(place.address_components || []);
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          setFormData(prev => ({
            ...prev,
            buildingNumber: parsed.buildingNumber || prev.buildingNumber,
            street: parsed.street || prev.street,
            city: parsed.city || prev.city,
            county: parsed.county || prev.county,
            postcode: parsed.postcode || prev.postcode,
            country: parsed.country || 'United Kingdom',
            latitude: lat.toString(),
            longitude: lng.toString()
          }));

          setAddressQuery(place.formatted_address);
          setSelectedAddress(place.formatted_address);
          setShowSuggestions(false);
          setAddressSuggestions([]);
        } else {
          console.error('Failed to get place details:', status);
        }
      }
    );
  };

  // Handle opening hours
  const updateOpeningHours = (day, field, value) => {
    if (applyToAll) {
      const updated = {};
      Object.keys(openingHours).forEach(d => {
        updated[d] = { ...openingHours[d], [field]: value };
      });
      setOpeningHours(updated);
    } else {
      setOpeningHours(prev => ({
        ...prev,
        [day]: { ...prev[day], [field]: value }
      }));
    }
  };

  const toggleDayClosed = (day) => {
    const isClosed = !openingHours[day].closed;
    if (applyToAll) {
      const updated = {};
      Object.keys(openingHours).forEach(d => {
        updated[d] = { ...openingHours[d], closed: isClosed };
      });
      setOpeningHours(updated);
    } else {
      setOpeningHours(prev => ({
        ...prev,
        [day]: { ...prev[day], closed: isClosed }
      }));
    }
  };

  const openTimePicker = (day, field) => {
    setSelectedDay(day);
    setSelectedTimeField(field);
    setTimePickerOpen(true);
  };

  const selectTime = (time) => {
    updateOpeningHours(selectedDay, selectedTimeField, time);
    setTimePickerOpen(false);
  };

  // Handle image uploads
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    setGalleryFiles(prev => [...prev, ...files]);
    const previews = files.map(f => URL.createObjectURL(f));
    setGalleryPreviews(prev => [...prev, ...previews]);
  };

  const removeGalleryImage = (index) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Build full address
  const buildFullAddress = () => {
    const parts = [];
    if (formData.buildingNumber) parts.push(formData.buildingNumber);
    if (formData.street) parts.push(formData.street);
    if (formData.city) parts.push(formData.city);
    if (formData.county) parts.push(formData.county);
    if (formData.postcode) parts.push(formData.postcode);
    if (formData.country) parts.push(formData.country);
    if (formData.landmark) parts.push(`Near: ${formData.landmark}`);
    return parts.join(', ');
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.category || !formData.latitude || !formData.longitude) {
      alert('Please fill in required fields: Business Name, Category, and Location (use address search to set coordinates)');
      return;
    }

    if (!formData.street || !formData.city || !formData.postcode) {
      alert('Please fill in required address fields: Street, City, and Postcode');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,

        // Address
        buildingNumber: formData.buildingNumber,
        street: formData.street,
        city: formData.city,
        county: formData.county,
        postcode: formData.postcode.toUpperCase(),
        country: formData.country,
        landmark: formData.landmark,
        address: buildFullAddress(),

        // Location
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius) || 50,

        // External links
        website: formData.website,
        tripAdvisorUrl: formData.tripAdvisorUrl,
        googleBusinessName: formData.googleBusinessName,
        facebook: formData.facebook,
        instagram: formData.instagram,
        twitter: formData.twitter,

        // Status
        status: formData.status,
        kycStatus: formData.kycStatus,

        // Opening hours
        openingHours
      };

      // Add owner info if included
      if (includeOwnerInfo && (formData.email || formData.firstName || formData.lastName)) {
        submitData.firstName = formData.firstName;
        submitData.lastName = formData.lastName;
        submitData.email = formData.email;
        submitData.phone = formData.phone;
        submitData.ownerName = `${formData.firstName} ${formData.lastName}`.trim();
      } else {
        submitData.skipOwnerCreation = true;
      }

      const response = await adminApi.createBusiness(submitData);
      const businessId = response.data.business._id;

      // Upload images if selected
      let logoUrl = null, coverUrl = null, galleryUrls = [];

      // Upload logo
      if (logoFile) {
        try {
          const logoRes = await adminApi.uploadBusinessLogo(businessId, logoFile);
          logoUrl = logoRes.data?.url || logoRes.data?.data?.url;
          console.log('Logo uploaded:', logoUrl);
        } catch (err) {
          console.error('Logo upload failed:', err);
        }
      }

      // Upload cover image
      if (coverFile) {
        try {
          const coverRes = await adminApi.uploadBusinessCover(businessId, coverFile);
          coverUrl = coverRes.data?.url || coverRes.data?.data?.url;
          console.log('Cover uploaded:', coverUrl);
        } catch (err) {
          console.error('Cover upload failed:', err);
        }
      }

      // Upload gallery images
      if (galleryFiles.length > 0) {
        try {
          const galleryRes = await adminApi.uploadBusinessGallery(businessId, galleryFiles);
          galleryUrls = galleryRes.data?.images?.map(img => img.url) || [];
          console.log('Gallery uploaded:', galleryUrls);
        } catch (err) {
          console.error('Gallery upload failed:', err);
        }
      }

      // Update business with image URLs if any were uploaded
      if (logoUrl || coverUrl || galleryUrls.length > 0) {
        const imageUpdate = {};
        if (logoUrl) imageUpdate.logo = { url: logoUrl };
        if (coverUrl) imageUpdate.coverImage = { url: coverUrl };
        if (galleryUrls.length > 0) {
          imageUpdate.images = galleryUrls.map(url => ({ url }));
        }

        try {
          await adminApi.updateBusiness(businessId, imageUpdate);
          console.log('Business updated with image URLs');
        } catch (err) {
          console.error('Failed to update business with images:', err);
        }
      }

      alert('Business created successfully!' + (logoUrl || coverUrl || galleryUrls.length > 0 ? ' Images uploaded.' : ''));
      navigate(`/businesses/${businessId}`);
    } catch (error) {
      console.error('Error creating business:', error);
      alert(error.response?.data?.message || 'Error creating business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/businesses')}
          className="mr-4 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Register New Business</h1>
          <p className="text-gray-600 mt-1">Add a business to the platform (owner info is optional)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Owner Information (Optional) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Owner Information</h2>
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Optional</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeOwnerInfo}
                onChange={(e) => setIncludeOwnerInfo(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 rounded-full transition ${includeOwnerInfo ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition transform ${includeOwnerInfo ? 'translate-x-5' : ''}`} />
              </div>
              <span className="ml-2 text-sm text-gray-600">Include owner</span>
            </label>
          </div>

          {includeOwnerInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="owner@business.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 7123 456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <Building2 className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="The Coffee House"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                disabled={loadingCategories}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat.value || cat.name.toLowerCase()}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Radius (meters)</label>
              <input
                type="number"
                name="radius"
                min="10"
                max="500"
                value={formData.radius}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Describe your business, services, and amenities..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Business Address</h2>
          </div>

          {/* Address Search */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Search for address or business name..."
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {searchingAddress && (
                <Loader2 className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => selectAddress(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start"
                  >
                    <MapPin className="w-4 h-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{suggestion.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* UK Format Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
              <input
                type="text"
                name="buildingNumber"
                value={formData.buildingNumber}
                onChange={handleChange}
                placeholder="12A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                required
                placeholder="High Street"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Town/City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="London"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
              <input
                type="text"
                name="county"
                value={formData.county}
                onChange={handleChange}
                placeholder="Greater London"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
                required
                placeholder="SW1A 1AA"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Landmark (Optional)</label>
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="Near Tesco, Opposite Post Office"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Location Picker */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 flex items-center">
                  <MapPin className="w-4 h-4 text-blue-600 mr-2" />
                  Pin Location on Map
                </p>
                {formData.latitude && formData.longitude ? (
                  <div className="mt-1">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center w-fit">
                      <Check className="w-3 h-3 mr-1" />
                      Location Set
                    </span>
                    {selectedAddress && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{selectedAddress}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Click the button to select location on map</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                <MapPin className="w-4 h-4" />
                {formData.latitude ? 'Change Location' : 'Pick Location'}
              </button>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Opening Hours</h2>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 rounded-full transition ${applyToAll ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition transform ${applyToAll ? 'translate-x-5' : ''}`} />
              </div>
              <span className="ml-2 text-sm text-gray-600">Apply to all days</span>
            </label>
          </div>

          <div className="space-y-3">
            {Object.entries(openingHours).map(([day, hours]) => (
              <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${hours.closed ? 'bg-red-400' : 'bg-green-400'}`} />
                  <span className="font-medium text-gray-900 capitalize w-24">{day}</span>
                </div>

                <div className="flex items-center space-x-4">
                  {!hours.closed && (
                    <>
                      <button
                        type="button"
                        onClick={() => openTimePicker(day, 'open')}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        {hours.open}
                      </button>
                      <span className="text-gray-400">to</span>
                      <button
                        type="button"
                        onClick={() => openTimePicker(day, 'close')}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        {hours.close}
                      </button>
                    </>
                  )}

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hours.closed}
                      onChange={() => toggleDayClosed(day)}
                      className="sr-only"
                    />
                    <div className={`relative w-10 h-5 rounded-full transition ${hours.closed ? 'bg-red-500' : 'bg-green-500'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${hours.closed ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className={`ml-2 text-xs font-medium ${hours.closed ? 'text-red-600' : 'text-green-600'}`}>
                      {hours.closed ? 'Closed' : 'Open'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <Image className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Images</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(''); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Plus className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload logo</span>
                      <span className="text-xs text-gray-400 mt-1">Recommended: 200x200 px</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
                {coverPreview ? (
                  <div className="relative">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Plus className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload cover</span>
                      <span className="text-xs text-gray-400 mt-1">Recommended: 1200x400 px</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {galleryPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={preview} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
                  <Plus className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Upload multiple photos to showcase your business</p>
            </div>
          </div>
        </div>

        {/* External Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <ExternalLink className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">External Links</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.yourbusiness.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Google Business Name</label>
              <input
                type="text"
                name="googleBusinessName"
                value={formData.googleBusinessName}
                onChange={handleChange}
                placeholder="My Restaurant, New York"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">TripAdvisor URL</label>
              <input
                type="url"
                name="tripAdvisorUrl"
                value={formData.tripAdvisorUrl}
                onChange={handleChange}
                placeholder="https://www.tripadvisor.com/Restaurant_Review..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Facebook className="w-4 h-4 inline mr-1" />
                Facebook
              </label>
              <input
                type="url"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/yourbusiness"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Instagram className="w-4 h-4 inline mr-1" />
                Instagram
              </label>
              <input
                type="url"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/yourbusiness"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KYC Status</label>
              <select
                name="kycStatus"
                value={formData.kycStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/businesses')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Create Business
              </>
            )}
          </button>
        </div>
      </form>

      {/* Time Picker Modal */}
      {timePickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">{selectedDay}</h3>
                <p className="text-sm text-gray-500">Select {selectedTimeField === 'open' ? 'opening' : 'closing'} time</p>
              </div>
              <button
                type="button"
                onClick={() => setTimePickerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => selectTime(time)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${openingHours[selectedDay]?.[selectedTimeField] === time
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      <LocationPicker
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initialLocation={
          formData.latitude && formData.longitude
            ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
            : null
        }
        onSelectLocation={(location) => {
          // Update coordinates
          setFormData(prev => ({
            ...prev,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            // Update address fields from location picker
            buildingNumber: location.addressComponents?.buildingNumber || prev.buildingNumber,
            street: location.addressComponents?.street || prev.street,
            city: location.addressComponents?.city || prev.city,
            county: location.addressComponents?.county || prev.county,
            postcode: location.addressComponents?.postcode || prev.postcode,
            country: location.addressComponents?.country || 'United Kingdom'
          }));
          setSelectedAddress(location.address);
          // Also update the address search query
          setAddressQuery(location.address);
        }}
      />
    </div>
  );
};

export default CreateBusiness;
