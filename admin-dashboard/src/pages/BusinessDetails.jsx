import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, MapPin, Phone, Mail, Globe, Star, Edit2, Save, X,
  Image as ImageIcon, QrCode, Download, Plane, Plus, Trash2, Clock, Bell,
  FileText, Eye, AlertTriangle, User, ChevronDown
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { format } from 'date-fns';
import ImageCropperModal from '../components/ImageCropperModal';
import BusinessMenuManagement from '../components/BusinessMenuManagement';

const BusinessDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [radius, setRadius] = useState('');
  const [orderRadius, setOrderRadius] = useState('');
  const [radiusEditing, setRadiusEditing] = useState(false);
  const [radiusLoading, setRadiusLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [tripAdvisorEditing, setTripAdvisorEditing] = useState(false);
  const [tripAdvisorLoading, setTripAdvisorLoading] = useState(false);

  // Push notification limit (per-owner, admin-controlled)
  const [notifLimit, setNotifLimit]           = useState(100);
  const [notifLimitInput, setNotifLimitInput] = useState('100');
  const [notifStats, setNotifStats]           = useState({ totalSent: 0, totalUsersReached: 0 });
  const [notifIsPro, setNotifIsPro]           = useState(false);
  const [notifEditing, setNotifEditing]       = useState(false);
  const [notifLoading, setNotifLoading]       = useState(false);
  const [notifOwnerFound, setNotifOwnerFound] = useState(false);
  const [tripAdvisorData, setTripAdvisorData] = useState({
    rating: '',
    reviewCount: '',
    profileUrl: ''
  });

  // Claim management state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [claimActionLoading, setClaimActionLoading] = useState(false);

  // Images state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropType, setCropType] = useState(null); // 'logo' | 'cover' | 'gallery'
  const [cropAspect, setCropAspect] = useState(1);

  const categories = [
    'restaurant', 'cafe', 'retail', 'services', 'healthcare',
    'education', 'entertainment', 'salon', 'hotel', 'gym', 'other'
  ];

  useEffect(() => {
    fetchBusinessDetails();
  }, [id]);

  useEffect(() => {
    if (!business?.owner?._id) return;
    fetchOwnerNotifSettings(business.owner._id);
  }, [business?.owner?._id]);

  const fetchOwnerNotifSettings = async (ownerId) => {
    try {
      // Use a large limit to avoid pagination cutting off the owner we need
      const res = await adminApi.getBusinessOwners({ limit: 1000 });
      const ownerIdStr = ownerId?.toString();
      const owner = res.data?.owners?.find(o => o._id?.toString() === ownerIdStr);
      if (owner) {
        setNotifOwnerFound(true);
        setNotifIsPro(owner.subscriptionStatus === 'active' || owner.subscriptionStatus === 'trialing');
        setNotifLimit(owner.pushNotifications?.maxReach ?? 100);
        setNotifLimitInput(String(owner.pushNotifications?.maxReach ?? 100));
        setNotifStats({
          totalSent: owner.pushNotifications?.totalSent ?? 0,
          totalUsersReached: owner.pushNotifications?.totalUsersReached ?? 0,
        });
      }
    } catch (e) { console.error('fetchOwnerNotifSettings error', e); }
  };

  const handleSaveNotifLimit = async () => {
    const val = parseInt(notifLimitInput);
    if (isNaN(val) || val < 1 || val > 100000) {
      alert('Please enter a valid number between 1 and 100,000');
      return;
    }
    setNotifLoading(true);
    try {
      await adminApi.setOwnerNotificationLimit(business.owner._id, val);
      setNotifLimit(val);
      setNotifEditing(false);
      alert(`Notification limit set to ${val} users per post`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update limit');
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (business) {
      setRadius(business.radius || 50);
      // Initialize TripAdvisor data
      setTripAdvisorData({
        rating: business.externalProfiles?.tripAdvisor?.rating || '',
        reviewCount: business.externalProfiles?.tripAdvisor?.reviewCount || '',
        profileUrl: business.externalProfiles?.tripAdvisor?.profileUrl || ''
      });
      // Initialize image previews from existing business data
      if (business.logo?.url) setLogoPreview(business.logo.url);
      if (business.coverImage?.url) setCoverPreview(business.coverImage.url);
      if (business.images?.length > 0) {
        setGalleryPreviews(business.images.map(img => img.url));
      } else {
        setGalleryPreviews([]);
      }
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
        setOrderRadius(businessData.orderRadius || 50);
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
          orderRadius: businessData.orderRadius || 50,
          website: businessData.socialMedia?.website || '',
          facebook: businessData.socialMedia?.facebook || '',
          instagram: businessData.socialMedia?.instagram || '',
          twitter: businessData.socialMedia?.twitter || '',
          tripAdvisorUrl: businessData.externalProfiles?.tripAdvisor?.profileUrl || '',
          googleBusinessName: businessData.externalProfiles?.googleBusiness?.businessName || '',
          status: businessData.status || 'pending',
          kycStatus: businessData.kycStatus || 'pending',
          openingHours: businessData.openingHours || {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '09:00', close: '17:00', closed: true },
            sunday: { open: '09:00', close: '17:00', closed: true },
          }
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
        orderRadius: business.orderRadius || 50,
        website: business.socialMedia?.website || '',
        facebook: business.socialMedia?.facebook || '',
        instagram: business.socialMedia?.instagram || '',
        twitter: business.socialMedia?.twitter || '',
        tripAdvisorUrl: business.externalProfiles?.tripAdvisor?.profileUrl || '',
        googleBusinessName: business.externalProfiles?.googleBusiness?.businessName || '',
        status: business.status || 'pending',
        kycStatus: business.kycStatus || 'pending',
        openingHours: business.openingHours || {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: true },
          sunday: { open: '09:00', close: '17:00', closed: true },
        }
      });
      // Reset images
      setLogoFile(null);
      setCoverFile(null);
      setGalleryFiles([]);
      setLogoPreview(business.logo?.url || '');
      setCoverPreview(business.coverImage?.url || '');
      setGalleryPreviews(business.images?.map(img => img.url) || []);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setEditFormData(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageDataUrl = await readFile(file);
      setCropImageSrc(imageDataUrl);
      setCropType('logo');
      setCropAspect(1); // 1:1 Square focus for logo
      setCropperOpen(true);
    }
    e.target.value = null; // reset input
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageDataUrl = await readFile(file);
      setCropImageSrc(imageDataUrl);
      setCropType('cover');
      setCropAspect(16 / 9); // 16:9 widescreen for cover
      setCropperOpen(true);
    }
    e.target.value = null; // reset input
  };

  const handleGalleryChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // NOTE: We only crop the FIRST image selected for simplicity in this implementation.
      // A robust gallery cropper would iterate through each file sequentially.
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setCropImageSrc(imageDataUrl);
      setCropType('gallery');
      setCropAspect(4 / 3); // Standard 4:3 view usually
      setCropperOpen(true);
    }
    e.target.value = null; // reset input
  };

  const handleCropComplete = async (croppedBlob) => {
    // Generate a file object from the blob
    const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(croppedBlob);

    if (cropType === 'logo') {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else if (cropType === 'cover') {
      setCoverFile(file);
      setCoverPreview(previewUrl);
    } else if (cropType === 'gallery') {
      setGalleryFiles(prev => [...prev, file]);
      setGalleryPreviews(prev => [...prev, previewUrl]);
    }

    setCropperOpen(false);
    setCropImageSrc(null);
  };

  const handleRemoveGalleryImage = (indexToRemove) => {
    const preview = galleryPreviews[indexToRemove];
    setGalleryPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));

    if (preview.startsWith('blob:') || preview.startsWith('data:')) {
      let fileIndex = 0;
      for (let i = 0; i < indexToRemove; i++) {
        if (galleryPreviews[i].startsWith('blob:') || galleryPreviews[i].startsWith('data:')) {
          fileIndex++;
        }
      }
      setGalleryFiles(prev => prev.filter((_, idx) => idx !== fileIndex));
    }
  };

  const handleUpdateBusiness = async () => {
    setUpdateLoading(true);
    try {
      await adminApi.updateBusiness(id, {
        ...editFormData,
        latitude: parseFloat(editFormData.latitude),
        longitude: parseFloat(editFormData.longitude),
        radius: parseInt(editFormData.radius),
        orderRadius: parseInt(editFormData.orderRadius)
      });

      // Handle Image Uploads
      const businessId = id;
      let logoUrl = null;
      let coverUrl = null;
      let newGalleryUrls = [];

      // Upload Logo if changed
      if (logoFile) {
        try {
          const logoRes = await adminApi.uploadBusinessLogo(businessId, logoFile);
          logoUrl = logoRes.data?.url || logoRes.data?.data?.url;
          console.log('Logo uploaded:', logoUrl);
        } catch (err) {
          console.error('Logo upload failed:', err);
        }
      }

      // Upload Cover if changed
      if (coverFile) {
        try {
          const coverRes = await adminApi.uploadBusinessCover(businessId, coverFile);
          coverUrl = coverRes.data?.url || coverRes.data?.data?.url;
          console.log('Cover uploaded:', coverUrl);
        } catch (err) {
          console.error('Cover upload failed:', err);
        }
      }

      // Upload New Gallery Images
      if (galleryFiles.length > 0) {
        try {
          const galleryRes = await adminApi.uploadBusinessGallery(businessId, galleryFiles);
          newGalleryUrls = galleryRes.data?.images?.map(img => img.url) || [];
          console.log('Gallery uploaded:', newGalleryUrls);
        } catch (err) {
          console.error('Gallery upload failed:', err);
        }
      }

      // Sync remaining existing images + newly uploaded ones
      const remainingExistingUrls = galleryPreviews.filter(
        url => !url.startsWith('blob:') && !url.startsWith('data:')
      );
      const finalGallery = [
        ...remainingExistingUrls,
        ...newGalleryUrls
      ].map(url => ({ url }));

      const imageUpdate = {};
      if (logoUrl) imageUpdate.logo = { url: logoUrl };
      if (coverUrl) imageUpdate.coverImage = { url: coverUrl };
      imageUpdate.images = finalGallery;

      // Check if any images (logo, cover, added gallery, or deleted gallery) changed
      const galleryChanged = remainingExistingUrls.length !== (business.images?.length || 0) || galleryFiles.length > 0;
      
      if (logoUrl || coverUrl || galleryChanged) {
        await adminApi.updateBusiness(businessId, imageUpdate);
      }

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
    const orderRadiusValue = parseInt(orderRadius);
    if (isNaN(radiusValue) || radiusValue < 10 || radiusValue > 500 || isNaN(orderRadiusValue) || orderRadiusValue < 10 || orderRadiusValue > 500) {
      alert('Radii must be numbers between 10 and 500 meters');
      return;
    }

    setRadiusLoading(true);
    try {
      // Use standard updateBusiness for both since updateBusinessRadius only does review radius
      await adminApi.updateBusiness(id, { radius: radiusValue, orderRadius: orderRadiusValue });
      alert(`Business radii updated successfully!`);
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

  const handleApproveClaim = async () => {
    if (!window.confirm('Are you sure you want to approve this claim? This will assign ownership to the claimant.')) return;
    
    // Safety check: ensure claimant is a business account
    if (business.claimRequest?.requestedBy?.role !== 'business') {
      alert('This user is currently a Customer. You must promote them to a Business Account before approving the claim.');
      return;
    }

    setClaimActionLoading(true);
    try {
      await adminApi.reviewBusinessClaim(id, 'approved');
      alert('Claim approved successfully! The user is now the owner of this business.');
      fetchBusinessDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve claim');
    } finally {
      setClaimActionLoading(false);
    }
  };

  const handlePromoteToBusiness = async (userId) => {
    if (!window.confirm('Are you sure you want to promote this user to a Business Account? This will create a separate BusinessOwner record for them.')) return;
    setClaimActionLoading(true);
    try {
      await adminApi.promoteUserToBusiness(userId);
      alert('User promoted to Business Account successfully!');
      fetchBusinessDetails();
    } catch (error) {
      console.error('Error promoting user:', error);
      alert(error.response?.data?.message || 'Failed to promote user');
    } finally {
      setClaimActionLoading(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectionReason) {
      alert('Please provide a reason for rejection');
      return;
    }
    setClaimActionLoading(true);
    try {
      await adminApi.reviewBusinessClaim(id, 'rejected', rejectionReason);
      alert('Claim rejected successfully.');
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchBusinessDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject claim');
    } finally {
      setClaimActionLoading(false);
    }
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Radius (meters) <span className="text-xs text-gray-500">(10-500)</span>
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      name="radius"
                      value={editFormData.radius}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Enter radius (10-500 meters)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Users can only review this business when within this radius</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Radius (meters) <span className="text-xs text-gray-500">(10-500)</span>
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="500"
                      name="orderRadius"
                      value={editFormData.orderRadius}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Enter order radius (10-500 meters)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Users can only order when within this radius</p>
                  </div>
                </div>

                {/* Hours Edit Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock size={20} className="mr-2 text-gray-500" />
                    Business Hours
                  </h3>
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-28 flex items-center">
                          <input
                            type="checkbox"
                            id={`closed-${day}`}
                            checked={!editFormData.openingHours[day].closed}
                            onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor={`closed-${day}`} className="text-sm font-medium text-gray-700 capitalize cursor-pointer">
                            {day}
                          </label>
                        </div>

                        <div className={`flex items-center gap-2 flex-1 ${editFormData.openingHours[day].closed ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input
                            type="time"
                            value={editFormData.openingHours[day].open || '09:00'}
                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={editFormData.openingHours[day].close || '17:00'}
                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        {editFormData.openingHours[day].closed && (
                          <span className="text-sm text-red-500 font-medium w-16 text-right">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
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

                {/* Hours Display Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <Clock size={16} className="mr-2" />
                    Opening Hours
                  </h3>
                  {business.openingHours ? (
                    <div className="space-y-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                        const hours = business.openingHours[day];
                        return (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="text-gray-500 capitalize w-24">{day}</span>
                            {hours && !hours.closed ? (
                              <span className="text-gray-900 font-medium">
                                {hours.open} - {hours.close}
                              </span>
                            ) : (
                              <span className="text-red-500 font-medium">Closed</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No hours configured</p>
                  )}
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

          {/* Business Claim Management Section */}
          {(!business.owner || (business.claimRequest && business.claimRequest.status === 'pending')) && (
            <div className={`rounded-xl shadow-md border-2 p-6 transition-all ${
              business.claimRequest?.status === 'pending'
                ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-100 ring-offset-2'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-2.5 rounded-xl ${
                  business.claimRequest?.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
                }`}>
                  <FileText className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Claim Status</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {business.owner ? 'Business is claimed' : 'This business is unclaimed'}
                  </p>
                </div>
              </div>

              {business.claimRequest && business.claimRequest.status === 'pending' ? (
                <div className="space-y-5">
                  <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Clock size={12} /> Pending Claim Request
                    </p>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">{business.claimRequest.requestedBy?.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600 truncate">{business.claimRequest.requestedBy?.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-gray-400" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 capitalize">Role: {business.claimRequest.requestedBy?.role || 'User'}</span>
                        {business.claimRequest.requestedBy?.role === 'business' ? (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">BUSINESS</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">CUSTOMER</span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Requested: {business.claimRequest.requestedAt ? format(new Date(business.claimRequest.requestedAt), 'dd MMM yyyy') : '—'}</span>
                      {business.claimRequest.verificationMethod && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          business.claimRequest.phoneVerified ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {business.claimRequest.verificationMethod === 'phone' ? '📱 Phone OTP' : '🪪 Documents'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Warning & Promotion Button */}
                {business.claimRequest.requestedBy?.role === 'customer' && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2 text-red-700">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-semibold leading-relaxed">
                        This user is currently using a standard Customer account. 
                        They must have a Business Account to become an owner.
                      </p>
                    </div>
                    <button
                      onClick={() => handlePromoteToBusiness(business.claimRequest.requestedBy._id)}
                      disabled={claimActionLoading}
                      className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <User size={14} /> Promote to Business Account
                    </button>
                  </div>
                )}

                {/* Documents Preview */}
                {business.documents && (business.documents.ownerIdProof?.url || business.documents.selfie?.url) && (
                  <div className="grid grid-cols-2 gap-3">
                    {business.documents.ownerIdProof?.url && (
                      <a href={business.documents.ownerIdProof.url} target="_blank" rel="noreferrer" className="group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 relative">
                          <img src={business.documents.ownerIdProof.url} alt="ID Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="text-white" size={20} />
                          </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-500 mt-1 font-medium">ID Proof</p>
                      </a>
                    )}
                    {business.documents.selfie?.url && (
                      <a href={business.documents.selfie.url} target="_blank" rel="noreferrer" className="group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 relative">
                          <img src={business.documents.selfie.url} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="text-white" size={20} />
                          </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-500 mt-1 font-medium">Selfie</p>
                      </a>
                    )}
                  </div>
                )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleApproveClaim}
                      disabled={claimActionLoading || business.claimRequest.requestedBy?.role !== 'business'}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        business.claimRequest.requestedBy?.role === 'business'
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-100'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      disabled={claimActionLoading}
                      className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 px-4">No pending claims for this business listing yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Geofencing Card - PROMINENT */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl shadow-md border-2 border-primary-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-primary-600 rounded-lg p-2 mr-3">
                  <MapPin className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Geofencing Settings</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Set the distance users must be within to post reviews or order (10-500 meters)
                  </p>
                </div>
              </div>
              {!radiusEditing && (
                <button
                  onClick={() => setRadiusEditing(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                >
                  <Edit2 size={16} className="mr-2" />
                  Change Radii
                </button>
              )}
            </div>
            {radiusEditing ? (
              <div className="bg-white rounded-lg p-4 border border-primary-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Radius (meters)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-lg font-semibold"
                        placeholder="10-500"
                      />
                      <span className="text-sm font-medium text-gray-600">m</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Radius (meters)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={orderRadius}
                        onChange={(e) => setOrderRadius(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-lg font-semibold"
                        placeholder="10-500"
                      />
                      <span className="text-sm font-medium text-gray-600">m</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdateRadius}
                    disabled={radiusLoading}
                    className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center shadow-sm"
                  >
                    <Save size={18} className="mr-2" />
                    {radiusLoading ? 'Saving...' : 'Save Radii'}
                  </button>
                  <button
                    onClick={() => {
                      setRadiusEditing(false);
                      setRadius(business.radius || 50);
                      setOrderRadius(business.orderRadius || 50);
                    }}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border border-primary-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Review Radius</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-primary-600">{business.radius || 50}</span>
                      <span className="text-xl font-medium text-gray-600">m</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Radius</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-primary-600">{business.orderRadius || 50}</span>
                      <span className="text-xl font-medium text-gray-600">m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Push Notification Limit Card — always visible */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl shadow-md border-2 border-orange-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-orange-500 rounded-lg p-2 mr-3">
                    <Bell className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Push Notification Limit</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Max users per Offer / Update post (Pro owners)</p>
                  </div>
                </div>
                {!notifEditing && (
                  <button
                    onClick={() => { setNotifEditing(true); setNotifLimitInput(String(notifLimit)); }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition shadow-sm flex items-center"
                  >
                    <Edit2 size={16} className="mr-2" />
                    Change Limit
                  </button>
                )}
              </div>

              {notifEditing ? (
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max users per post <span className="text-xs text-gray-400">(1 – 100,000)</span>
                  </label>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={notifLimitInput}
                      onChange={(e) => setNotifLimitInput(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-lg font-semibold"
                      placeholder="e.g. 500"
                    />
                    <span className="text-base font-medium text-gray-500">users</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotifLimit}
                      disabled={notifLoading}
                      className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center"
                    >
                      <Save size={18} className="mr-2" />
                      {notifLoading ? 'Saving...' : 'Save Limit'}
                    </button>
                    <button
                      onClick={() => setNotifEditing(false)}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-5 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Current Limit</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-orange-500">{notifLimit}</span>
                        <span className="text-base font-medium text-gray-600">users / post</span>
                      </div>
                    </div>
                    {notifIsPro ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Pro Active</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Not Pro</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-orange-100">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{notifStats.totalSent.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{notifStats.totalUsersReached.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Users Reached</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Images</h2>

            {editing ? (
              <div className="space-y-6">
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
                            <span className="text-xs text-gray-400 mt-1">Full Image</span>
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
                            <span className="text-xs text-gray-400 mt-1">Full Image</span>
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
                </div>

                {/* Gallery Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gallery Images</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {galleryPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square group">
                        <img src={preview} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition opacity-90 hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
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
                  <p className="text-xs text-gray-500 mt-2">New gallery images will be appended to existing ones.</p>
                </div>
              </div>
            ) : (
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

                {(!business.logo?.url && !business.coverImage?.url && (!business.images || business.images.length === 0)) && (
                  <p className="text-gray-500 italic">No images uploaded.</p>
                )}
              </div>
            )}
          </div>


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

          {/* Menu & Services Catalog Management */}
          <div className="mt-6">
            <BusinessMenuManagement businessId={id} />
          </div>
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

      {/* Rejection Modal for Claims */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2.5 rounded-full">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Reject Claim</h3>
                  <p className="text-sm text-gray-500">Provide a reason for the claimant</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Identity documents are blurry or invalid..."
                  className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none text-sm"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectClaim}
                  disabled={claimActionLoading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                >
                  {claimActionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Confirm Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropImageSrc}
        aspect={cropAspect}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setCropperOpen(false);
          setCropImageSrc(null);
        }}
      />
    </div>
  );
};

export default BusinessDetails;
