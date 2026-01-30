import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MapPin, Phone, Mail, Globe, Star, Edit2, Save, X, Image as ImageIcon, QrCode, Download, Plane } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { format } from 'date-fns';

const BusinessDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [radius, setRadius] = useState('');
  const [radiusEditing, setRadiusEditing] = useState(false);
  const [radiusLoading, setRadiusLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [tripAdvisorEditing, setTripAdvisorEditing] = useState(false);
  const [tripAdvisorLoading, setTripAdvisorLoading] = useState(false);
  const [tripAdvisorData, setTripAdvisorData] = useState({
    rating: '',
    reviewCount: '',
    profileUrl: ''
  });

  const categories = [
    'restaurant', 'cafe', 'retail', 'services', 'healthcare',
    'education', 'entertainment', 'salon', 'hotel', 'gym', 'other'
  ];

  useEffect(() => {
    fetchBusinessDetails();
  }, [id]);

  useEffect(() => {
    if (business) {
      setRadius(business.radius || 50);
      // Initialize TripAdvisor data
      setTripAdvisorData({
        rating: business.externalProfiles?.tripAdvisor?.rating || '',
        reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount || '',
        profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
      });
    }
  }, [business]);

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBusinessById(id);
      // Response format: { success: true, business }
      const businessData = response.data?.business || response.business;
      if (businessData) {
        setBusiness(businessData);
        setRadius(businessData.radius || 50);
        // Initialize edit form with business data
        setEditFormData({
          name: businessData.name || '',
          description: businessData.description || '',
          email: businessData.email || '',
          phone: businessData.phone || '',
          category: businessData.category || '',
          address: businessData.address?.fullAddress || '',
          latitude: businessData.location?.coordinates?.[1] || '',
          longitude: businessData.location?.coordinates?.[0] || '',
          radius: businessData.radius || 50,
          website: businessData.socialMedia?.website || '',
          facebook: businessData.socialMedia?.facebook || '',
          instagram: businessData.socialMedia?.instagram || '',
          twitter: businessData.socialMedia?.twitter || '',
          tripAdvisorUrl: businessData.externalProfiles?.tripAdvisor?.profileUrl || '',
          googleBusinessName: businessData.externalProfiles?.googleBusiness?.businessName || '',
          status: businessData.status || 'pending',
          kycStatus: businessData.kycStatus || 'pending'
        });
      } else {
        alert('Business not found');
        navigate('/businesses');
      }
    } catch (error) {
      console.error('Error fetching business:', error);
      alert(error.response?.data?.message || 'Error loading business details');
      navigate('/businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // Reset form data
    if (business) {
      setEditFormData({
        name: business.name || '',
        description: business.description || '',
        email: business.email || '',
        phone: business.phone || '',
        category: business.category || '',
        address: business.address?.fullAddress || '',
        latitude: business.location?.coordinates?.[1] || '',
        longitude: business.location?.coordinates?.[0] || '',
        radius: business.radius || 50,
        website: business.socialMedia?.website || '',
        facebook: business.socialMedia?.facebook || '',
        instagram: business.socialMedia?.instagram || '',
        twitter: business.socialMedia?.twitter || '',
        tripAdvisorUrl: business.externalProfiles?.tripAdvisor?.profileUrl || '',
        googleBusinessName: business.externalProfiles?.googleBusiness?.businessName || '',
        status: business.status || 'pending',
        kycStatus: business.kycStatus || 'pending'
      });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateBusiness = async () => {
    setUpdateLoading(true);
    try {
      await adminApi.updateBusiness(id, {
        ...editFormData,
        latitude: parseFloat(editFormData.latitude),
        longitude: parseFloat(editFormData.longitude),
        radius: parseInt(editFormData.radius)
      });
      alert('Business updated successfully!');
      setEditing(false);
      fetchBusinessDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating business');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleKYCAction = async (action) => {
    if (action === 'reject' && !reason) {
      alert('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.updateBusinessKYC(id, action, reason);
      alert(`Business ${action}ed successfully`);
      fetchBusinessDetails();
      setReason('');
    } catch (error) {
      console.error('KYC action error:', error);
      alert(error.response?.data?.message || 'Failed to update KYC status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRadius = async () => {
    const radiusValue = parseInt(radius);
    if (isNaN(radiusValue) || radiusValue < 10 || radiusValue > 500) {
      alert('Radius must be a number between 10 and 500 meters');
      return;
    }

    setRadiusLoading(true);
    try {
      await adminApi.updateBusinessRadius(id, radiusValue);
      alert(`Business review radius updated to ${radiusValue}m successfully!`);
      fetchBusinessDetails();
      setRadiusEditing(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating radius');
    } finally {
      setRadiusLoading(false);
    }
  };

  const handleTripAdvisorEdit = () => {
    setTripAdvisorEditing(true);
  };

  const handleTripAdvisorCancel = () => {
    setTripAdvisorEditing(false);
    // Reset to original data
    setTripAdvisorData({
      rating: business.externalProfiles?.tripAdvisor?.rating || '',
      reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount || '',
      profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
    });
  };

  const handleTripAdvisorSave = async () => {
    // Validate data
    const rating = parseFloat(tripAdvisorData.rating);
    const reviewCount = parseInt(tripAdvisorData.reviewCount);

    if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
      alert('Rating must be between 1 and 5');
      return;
    }

    if (reviewCount && (isNaN(reviewCount) || reviewCount < 0)) {
      alert('Review count must be a positive number');
      return;
    }

    setTripAdvisorLoading(true);
    try {
      await adminApi.updateTripAdvisorRating(id, {
        rating: rating || null,
        reviewCount: reviewCount || null,
        profileUrl: tripAdvisorData.profileUrl || null
      });
      alert('TripAdvisor rating updated successfully!');
      fetchBusinessDetails();
      setTripAdvisorEditing(false);
    } catch (error) {
      console.error('Error updating TripAdvisor rating:', error);
      alert(error.response?.data?.message || 'Error updating TripAdvisor rating');
    } finally {
      setTripAdvisorLoading(false);
    }
  };

  const handleTripAdvisorChange = (e) => {
    const { name, value } = e.target;
    setTripAdvisorData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Business not found</p>
        <button
          onClick={() => navigate('/businesses')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Businesses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/businesses')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-600 mt-1">Business Details & Management</p>
          </div>
        </div>
        {!editing ? (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition flex items-center"
          >
            <Edit2 size={18} className="mr-2" />
            Edit Business
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition flex items-center"
            >
              <X size={18} className="mr-2" />
              Cancel
            </button>
            <button
              onClick={handleUpdateBusiness}
              disabled={updateLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center"
            >
              <Save size={18} className="mr-2" />
              {updateLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Business Information</h2>
              {!editing && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                  {business.category}
                </span>
              )}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      name="category"
                      value={editFormData.category}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={editFormData.latitude}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={editFormData.longitude}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Radius (meters) <span className="text-xs text-gray-500">(10-500)</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    name="radius"
                    value={editFormData.radius}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-primary-50"
                    placeholder="Enter radius (10-500 meters)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Users can only review this business when within this radius</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="text-gray-400 mt-1 mr-3" size={20} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{business.address?.fullAddress || 'N/A'}</p>
                    {business.location?.coordinates && (
                      <p className="text-xs text-gray-400 mt-1">
                        Location: {business.location.coordinates[1]?.toFixed(6)}, {business.location.coordinates[0]?.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{business.email}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="text-gray-400 mt-1 mr-3" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{business.phone}</p>
                  </div>
                </div>
                {business.socialMedia?.website && (
                  <div className="flex items-start">
                    <Globe className="text-gray-400 mt-1 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Website</p>
                      <a
                        href={business.socialMedia.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {business.socialMedia.website}
                      </a>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-900 mt-1">{business.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="text-gray-900 capitalize">{business.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rating</p>
                    <div className="flex items-center">
                      <Star className="text-yellow-500 fill-current mr-1" size={16} />
                      <span className="text-gray-900">
                        {business.rating?.average?.toFixed(1) || '0.0'} ({business.reviewCount || 0} reviews)
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Social Media & External Links */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Social Media & External Links</h2>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={editFormData.website}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                    <input
                      type="url"
                      name="facebook"
                      value={editFormData.facebook}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                    <input
                      type="url"
                      name="instagram"
                      value={editFormData.instagram}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter</label>
                    <input
                      type="url"
                      name="twitter"
                      value={editFormData.twitter}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">TripAdvisor URL</label>
                    <input
                      type="url"
                      name="tripAdvisorUrl"
                      value={editFormData.tripAdvisorUrl}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Google Business Name</label>
                    <input
                      type="text"
                      name="googleBusinessName"
                      value={editFormData.googleBusinessName}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {business.socialMedia?.facebook && (
                  <div>
                    <p className="text-sm text-gray-500">Facebook</p>
                    <a href={business.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {business.socialMedia.facebook}
                    </a>
                  </div>
                )}
                {business.socialMedia?.instagram && (
                  <div>
                    <p className="text-sm text-gray-500">Instagram</p>
                    <a href={business.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {business.socialMedia.instagram}
                    </a>
                  </div>
                )}
                {business.socialMedia?.twitter && (
                  <div>
                    <p className="text-sm text-gray-500">Twitter</p>
                    <a href={business.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {business.socialMedia.twitter}
                    </a>
                  </div>
                )}
                {business.externalProfiles?.tripAdvisor?.profileUrl && (
                  <div>
                    <p className="text-sm text-gray-500">TripAdvisor</p>
                    <a href={business.externalProfiles.tripAdvisor.profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {business.externalProfiles.tripAdvisor.profileUrl}
                    </a>
                  </div>
                )}
                {business.externalProfiles?.googleBusiness?.businessName && (
                  <div>
                    <p className="text-sm text-gray-500">Google Business</p>
                    <p className="text-gray-900">{business.externalProfiles.googleBusiness.businessName}</p>
                    {business.externalProfiles.googleBusiness.rating && (
                      <p className="text-xs text-gray-500 mt-1">
                        Rating: {business.externalProfiles.googleBusiness.rating} ({business.externalProfiles.googleBusiness.reviewCount} reviews)
                      </p>
                    )}
                  </div>
                )}
                {!business.socialMedia?.facebook && !business.socialMedia?.instagram && !business.socialMedia?.twitter && !business.externalProfiles?.tripAdvisor?.profileUrl && !business.externalProfiles?.googleBusiness?.businessName && (
                  <p className="text-gray-500 text-sm">No social media or external links configured</p>
                )}
              </div>
            )}
          </div>

          {/* TripAdvisor Rating Management - PROMINENT */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow-md border-2 border-orange-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-orange-600 rounded-lg p-2 mr-3">
                  <Plane className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">TripAdvisor Rating Management</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Manually set TripAdvisor rating and review count for this business
                  </p>
                </div>
              </div>
              {!tripAdvisorEditing && (
                <button
                  onClick={handleTripAdvisorEdit}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                >
                  <Edit2 size={16} className="mr-2" />
                  Manage Rating
                </button>
              )}
            </div>
            {tripAdvisorEditing ? (
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating (1-5)
                    </label>
                    <input
                      type="number"
                      name="rating"
                      min="1"
                      max="5"
                      step="0.1"
                      value={tripAdvisorData.rating}
                      onChange={handleTripAdvisorChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-lg font-semibold"
                      placeholder="e.g., 4.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Count
                    </label>
                    <input
                      type="number"
                      name="reviewCount"
                      min="0"
                      value={tripAdvisorData.reviewCount}
                      onChange={handleTripAdvisorChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-lg font-semibold"
                      placeholder="e.g., 250"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile URL
                    </label>
                    <input
                      type="url"
                      name="profileUrl"
                      value={tripAdvisorData.profileUrl}
                      onChange={handleTripAdvisorChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="https://tripadvisor.com/..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleTripAdvisorCancel}
                    disabled={tripAdvisorLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTripAdvisorSave}
                    disabled={tripAdvisorLoading}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {tripAdvisorLoading ? 'Saving...' : 'Save TripAdvisor Data'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-orange-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Rating</p>
                    {business.externalProfiles?.tripAdvisor?.rating ? (
                      <div className="flex items-center">
                        <Star className="text-orange-500 fill-current mr-2" size={24} />
                        <span className="text-3xl font-bold text-gray-900">
                          {business.externalProfiles.tripAdvisor.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-500 ml-1">/5</span>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-lg">Not set</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Review Count</p>
                    {business.externalProfiles?.tripAdvisor?.reviewCount ? (
                      <p className="text-3xl font-bold text-gray-900">
                        {business.externalProfiles.tripAdvisor.reviewCount}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-lg">Not set</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Profile URL</p>
                    {business.externalProfiles?.tripAdvisor?.profileUrl ? (
                      <a
                        href={business.externalProfiles.tripAdvisor.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:underline text-sm break-all"
                      >
                        View Profile →
                      </a>
                    ) : (
                      <p className="text-gray-400 text-sm">Not set</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Review Radius Card - PROMINENT */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl shadow-md border-2 border-primary-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-primary-600 rounded-lg p-2 mr-3">
                  <MapPin className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review Radius Setting</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Set the distance users must be within to post reviews (10-500 meters)
                  </p>
                </div>
              </div>
              {!radiusEditing && (
                <button
                  onClick={() => setRadiusEditing(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                >
                  <Edit2 size={16} className="mr-2" />
                  Change Radius
                </button>
              )}
            </div>
            {radiusEditing ? (
              <div className="bg-white rounded-lg p-4 border border-primary-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Radius (meters)</label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-lg font-semibold"
                      placeholder="Enter radius (10-500)"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <span className="text-lg font-medium text-gray-600">meters</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateRadius}
                    disabled={radiusLoading}
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center shadow-sm"
                  >
                    <Save size={18} className="mr-2" />
                    {radiusLoading ? 'Saving...' : 'Save Radius'}
                  </button>
                  <button
                    onClick={() => {
                      setRadiusEditing(false);
                      setRadius(business.radius || 50);
                    }}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Review Radius</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-primary-600">{business.radius || 50}</span>
                      <span className="text-xl font-medium text-gray-600">meters</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Users can review within</p>
                    <p className="text-sm font-semibold text-gray-700">{business.radius || 50}m of this location</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Code Section - Show for all active businesses */}
          {business.status === 'active' && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-md border-2 border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-purple-600 rounded-lg p-2 mr-3">
                    <QrCode className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Business QR Code</h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {business.qrCode
                        ? 'Generated automatically when business was approved'
                        : 'QR code will be generated when business is approved'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-purple-200 flex flex-col items-center">
                {business.qrCode ? (
                  <>
                    <img
                      src={business.qrCode}
                      alt="Business QR Code"
                      className="w-64 h-64 object-contain rounded-lg shadow-lg mb-4"
                      onError={(e) => {
                        console.error('QR code image failed to load');
                        e.target.style.display = 'none';
                      }}
                    />
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Users can scan this QR code to view business details and leave reviews
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          // Create download link
                          const link = document.createElement('a');
                          link.href = business.qrCode;
                          link.download = `${business.name.replace(/[^a-z0-9]/gi, '_')}_QRCode.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                      >
                        <Download size={18} className="mr-2" />
                        Download QR Code
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Regenerate QR code with new smart URL format? This will update the existing QR code.')) return;
                          try {
                            setQrGenerating(true);
                            const response = await adminApi.generateBusinessQRCode(id);
                            if (response.data?.success) {
                              await fetchBusinessDetails();
                              alert('QR code regenerated successfully with new URL format!');
                            }
                          } catch (error) {
                            console.error('Error regenerating QR code:', error);
                            alert(error.response?.data?.message || 'Failed to regenerate QR code');
                          } finally {
                            setQrGenerating(false);
                          }
                        }}
                        disabled={qrGenerating}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                        title="Regenerate QR code with new smart URL format"
                      >
                        {qrGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <QrCode size={18} className="mr-2" />
                            Regenerate
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                      <QrCode className="text-gray-400" size={64} />
                    </div>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      QR code not generated yet. Click below to generate it now.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          setQrGenerating(true);
                          const response = await adminApi.generateBusinessQRCode(id);
                          if (response.data?.success) {
                            // Refresh business data
                            await fetchBusinessDetails();
                            alert('QR code generated successfully!');
                          }
                        } catch (error) {
                          console.error('Error generating QR code:', error);
                          alert(error.response?.data?.message || 'Failed to generate QR code');
                        } finally {
                          setQrGenerating(false);
                        }
                      }}
                      disabled={qrGenerating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                    >
                      {qrGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <QrCode size={18} className="mr-2" />
                          Generate QR Code
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Images */}
          {(business.logo || business.coverImage || (business.images && business.images.length > 0)) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Images</h2>
              <div className="space-y-4">
                {business.logo?.url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Logo</p>
                    <img src={business.logo.url} alt="Business Logo" className="h-32 w-32 object-cover rounded-lg shadow-sm" />
                  </div>
                )}
                {business.coverImage?.url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Cover Image</p>
                    <img src={business.coverImage.url} alt="Cover" className="w-full h-48 object-cover rounded-lg shadow-sm" />
                  </div>
                )}
                {business.images && business.images.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Gallery ({business.images.length} images)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {business.images.map((img, idx) => (
                        <img key={idx} src={img.url} alt={`Gallery ${idx + 1}`} className="w-full h-24 object-cover rounded-lg shadow-sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* KYC Documents */}
          {business.documents && (business.documents.addressProof || business.documents.selfie) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC Documents (Identity Verification)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Address Proof */}
                {business.documents.addressProof?.url && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">Address Proof</p>
                    <a
                      href={business.documents.addressProof.url.startsWith('http')
                        ? business.documents.addressProof.url
                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${business.documents.addressProof.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={business.documents.addressProof.url.startsWith('http')
                          ? business.documents.addressProof.url
                          : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${business.documents.addressProof.url}`}
                        alt="Address Proof"
                        className="w-full h-48 object-cover rounded-md bg-gray-50 border border-gray-100"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Image not found</text></svg>';
                        }}
                      />
                    </a>
                  </div>
                )}

                {/* Selfie */}
                {business.documents.selfie?.url && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">Owner Selfie</p>
                    <a
                      href={business.documents.selfie.url.startsWith('http')
                        ? business.documents.selfie.url
                        : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${business.documents.selfie.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={business.documents.selfie.url.startsWith('http')
                          ? business.documents.selfie.url
                          : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${business.documents.selfie.url}`}
                        alt="Selfie"
                        className="w-full h-48 object-cover rounded-md bg-gray-50 border border-gray-100"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Image not found</text></svg>';
                        }}
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status & Verification</h2>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Status</label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">KYC Status</label>
                  <select
                    name="kycStatus"
                    value={editFormData.kycStatus}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Business Status</p>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${business.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : business.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {business.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">KYC Status</p>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${business.kycStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : business.kycStatus === 'in_review'
                        ? 'bg-blue-100 text-blue-800'
                        : business.kycStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                  >
                    {business.kycStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registered</p>
                  <p className="text-gray-900 mt-1">
                    {format(new Date(business.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                {business.verifiedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Verified</p>
                    <p className="text-gray-900 mt-1">
                      {format(new Date(business.verifiedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Owner Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-gray-900">{business.owner?.name || business.ownerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{business.owner?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900">{business.owner?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* KYC Actions */}
          {business.kycStatus === 'in_review' && !editing && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border-2 border-blue-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">KYC Review Actions</h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleKYCAction('approve')}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve Business
                </button>

                <div>
                  <textarea
                    placeholder="Reason for rejection (required)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    rows="3"
                  />
                  <button
                    onClick={() => handleKYCAction('reject')}
                    disabled={actionLoading || !reason}
                    className="w-full mt-2 flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                  >
                    <XCircle size={20} className="mr-2" />
                    Reject Business
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDetails;
