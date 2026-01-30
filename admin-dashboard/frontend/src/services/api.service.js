import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and implement Failover
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Check if network error or connection refused (Primary Down)
    if (!originalRequest._retry && (error.code === 'ERR_NETWORK' || error.message.includes('Network Error'))) {
      console.log('🔍 Primary server error details:', {
        code: error.code,
        message: error.message,
        config: {
          url: originalRequest.url,
          baseURL: originalRequest.baseURL,
          timeout: originalRequest.timeout
        }
      });
      console.warn('⚠️ Primary server unreachable. Switching to Failover Server (Render)...');
      originalRequest._retry = true; // Mark as retried

      // Update Base URL to Secondary Request
      originalRequest.baseURL = API_CONFIG.SECONDARY_BASE_URL;

      // Retry the request
      return apiClient(originalRequest);
    }

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }

    const data = error.response?.data;
    let errorMessage = data?.message || error.message || 'Something went wrong';

    if (data?.reason) {
      errorMessage = `${errorMessage} ${data.reason}`;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// Helper function to safely build endpoint URLs
const buildEndpoint = (template, params) => {
  if (!template) {
    console.error('Undefined endpoint template');
    return '';
  }
  let url = template;
  if (params) {
    Object.keys(params).forEach(key => {
      url = url.replace(`:${key}`, params[key]);
    });
  }
  return url;
};

// API Service
const ApiService = {
  // Auth APIs
  register: (data) => apiClient.post(API_CONFIG.ENDPOINTS.REGISTER, data),
  login: (data) => apiClient.post(API_CONFIG.ENDPOINTS.LOGIN, data),
  sendOTP: (data) => apiClient.post(API_CONFIG.ENDPOINTS.SEND_OTP, data),
  loginWithPhone: (data) => apiClient.post(API_CONFIG.ENDPOINTS.LOGIN_PHONE, data),
  forgotPassword: (data) => apiClient.post(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, data),
  resetPassword: (data) => apiClient.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, data),
  resetPasswordWithOTP: (data) => apiClient.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD_OTP, data),
  getMe: () => apiClient.get(API_CONFIG.ENDPOINTS.GET_ME),
  updatePushToken: (data) => apiClient.put(API_CONFIG.ENDPOINTS.UPDATE_PUSH_TOKEN, data),
  sendEmailOTP: (data) => apiClient.post(API_CONFIG.ENDPOINTS.SEND_EMAIL_OTP, data),
  verifyEmailOTP: (data) => apiClient.post(API_CONFIG.ENDPOINTS.VERIFY_EMAIL_OTP, data),

  // User APIs
  getProfile: () => apiClient.get(API_CONFIG.ENDPOINTS.GET_PROFILE),
  updateProfile: (data) => apiClient.put(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, data),
  uploadProfileImage: (formData) => apiClient.post('/users/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data) => apiClient.post('/users/change-password', data),
  getUserReviews: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_USER_REVIEWS, { params }),
  getUserCoupons: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_USER_COUPONS, { params }),
  getRewardHistory: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_REWARD_HISTORY, { params }),

  // Business APIs
  registerBusiness: (data) => {
    // Remove logo and coverImage from data (will be uploaded separately later)
    // For now, just send business data as JSON
    const { logo, coverImage, ...businessData } = data;

    console.log('📤 API Service - Sending business registration:', businessData);
    console.log('🌍 Coordinates:', businessData.latitude, businessData.longitude);

    // TODO: Upload images separately and get URLs
    // For now, register business without images

    return apiClient.post(API_CONFIG.ENDPOINTS.REGISTER_BUSINESS, businessData);
  },
  getAllActiveBusinesses: (params) => apiClient.get('/business/all', { params }),
  getNearbyBusinesses: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_NEARBY_BUSINESSES, { params }),
  searchBusinesses: (params) => apiClient.get(API_CONFIG.ENDPOINTS.SEARCH_BUSINESSES, { params }),

  // Category APIs
  getCategories: () => apiClient.get('/categories'),
  getCategory: (id) => apiClient.get(`/categories/${id}`),
  getBusiness: (id) => apiClient.get(`${API_CONFIG.ENDPOINTS.GET_BUSINESS}/${id}`),
  getBusinessDashboard: (id) => apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_BUSINESS_DASHBOARD, { id })),
  uploadDocuments: (id, formData) => apiClient.post(
    buildEndpoint(API_CONFIG.ENDPOINTS.UPLOAD_DOCUMENTS, { id }),
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  generateQR: (id) => apiClient.post(buildEndpoint(API_CONFIG.ENDPOINTS.GENERATE_QR, { id })),
  getMyBusinesses: () => apiClient.get(API_CONFIG.ENDPOINTS.GET_MY_BUSINESSES),

  // Review APIs
  createReview: (data) => apiClient.post(API_CONFIG.ENDPOINTS.CREATE_REVIEW, data),
  getBusinessReviews: (businessId, params) =>
    apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_BUSINESS_REVIEWS, { businessId }), { params }),
  getReview: (id) => apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_REVIEW, { id })),
  updateReview: (id, data) => apiClient.put(buildEndpoint(API_CONFIG.ENDPOINTS.UPDATE_REVIEW, { id }), data),
  deleteReview: (id) => apiClient.delete(buildEndpoint(API_CONFIG.ENDPOINTS.DELETE_REVIEW, { id })),
  markHelpful: (id) => apiClient.post(buildEndpoint(API_CONFIG.ENDPOINTS.MARK_HELPFUL, { id })),

  // Coupon APIs (Review-reward coupons)
  getCoupons: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_COUPONS, { params }),
  getCoupon: (id) => apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_COUPON, { id })),
  verifyCoupon: (data) => apiClient.post(API_CONFIG.ENDPOINTS.VERIFY_COUPON, data),
  redeemCoupon: (id) => apiClient.post(buildEndpoint(API_CONFIG.ENDPOINTS.REDEEM_COUPON, { id })),
  getBusinessCoupons: (businessId) =>
    apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_BUSINESS_COUPONS, { businessId })),
  createCoupon: (data) => apiClient.post(API_CONFIG.ENDPOINTS.CREATE_COUPON, data),

  // Business Promotional Coupon APIs
  getBusinessCouponsList: (businessId) => apiClient.get(`/business-coupons/business/${businessId}`),
  createBusinessCoupon: (data) => apiClient.post('/business-coupons', data),
  updateBusinessCoupon: (id, data) => apiClient.put(`/business-coupons/${id}`, data),
  deleteBusinessCoupon: (id) => apiClient.delete(`/business-coupons/${id}`),
  toggleCouponStatus: (id) => apiClient.patch(`/business-coupons/${id}/toggle-status`),
  scanAndRedeemCoupon: (qrCodeData) => apiClient.post('/business-coupons/scan-redeem', { qrCodeData }),
  getRedemptionStats: (businessId) => apiClient.get(`/business-coupons/redemption-stats/${businessId}`),

  // Coupon Template APIs (for review rewards)
  getBusinessCouponTemplate: (businessId) => apiClient.get(`/coupons/template/${businessId}`),
  createCouponTemplate: (data) => apiClient.post('/coupons/template', data),

  updateBusiness: (id, data) => apiClient.put(`/business/${id}`, data),

  // Notification APIs
  getNotifications: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_NOTIFICATIONS, { params }),
  markAsRead: (id) => apiClient.put(buildEndpoint(API_CONFIG.ENDPOINTS.MARK_AS_READ, { id })),
  markAllRead: () => apiClient.put(API_CONFIG.ENDPOINTS.MARK_ALL_READ),

  // Admin APIs - Full management capabilities
  getDashboardStats: () => apiClient.get(API_CONFIG.ENDPOINTS.GET_DASHBOARD_STATS),

  // Admin Notifications
  sendAdminNotification: (data) => apiClient.post('/admin/notifications/send', data),

  // Category Management
  createCategory: (data) => apiClient.post('/categories', data),
  updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`),

  // Business Management
  adminGetAllBusinesses: () => apiClient.get('/admin/businesses'),
  adminGetBusiness: (id) => apiClient.get(`/admin/businesses/${id}`),
  adminUpdateBusiness: (id, data) => apiClient.put(`/admin/businesses/${id}`, data),
  adminUpdateBusinessKYC: (id, data) => apiClient.put(`/admin/businesses/${id}/kyc`, data),
  adminDeleteBusiness: (id) => apiClient.delete(`/admin/businesses/${id}`),

  // User Management
  adminGetAllUsers: () => apiClient.get('/admin/users'),
  adminUpdateUserStatus: (id, data) => apiClient.put(`/admin/users/${id}/status`, data),
  adminDeleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  adminSuspendUser: (id, data) => apiClient.post(`/admin/users/${id}/suspend`, data),

  // Review Management
  adminGetAllReviews: () => apiClient.get('/admin/reviews'),
  adminUpdateReviewStatus: (id, data) => apiClient.put(`/admin/reviews/${id}/status`, data),

  // Coupon Management (Admin)
  adminGetAllCoupons: () => apiClient.get('/admin/coupons'),
  adminToggleCouponStatus: (id, data) => apiClient.put(`/admin/coupons/${id}/status`, data),
  adminDeleteCoupon: (id) => apiClient.delete(`/admin/coupons/${id}`),
  // getAllUsers: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_ALL_USERS, { params }),
  // getAllBusinesses: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_ALL_BUSINESSES, { params }),
  // updateBusinessKYC: (id, data) => apiClient.put(API_CONFIG.ENDPOINTS.UPDATE_BUSINESS_KYC.replace(':id', id), data),
  // updateUserStatus: (id, data) => apiClient.put(API_CONFIG.ENDPOINTS.UPDATE_USER_STATUS.replace(':id', id), data),
  // getAllReviews: (params) => apiClient.get(API_CONFIG.ENDPOINTS.GET_ALL_REVIEWS, { params }),
  // sendNotification: (data) => apiClient.post(API_CONFIG.ENDPOINTS.SEND_NOTIFICATION, data),

  // Chat APIs
  getChatHistory: (userId, params) => {
    if (!userId || !API_CONFIG.ENDPOINTS.GET_CHAT_HISTORY) {
      return Promise.reject(new Error('Invalid chat history request'));
    }
    return apiClient.get(buildEndpoint(API_CONFIG.ENDPOINTS.GET_CHAT_HISTORY, { userId }), { params });
  },
  sendMessage: (data) => apiClient.post(API_CONFIG.ENDPOINTS.SEND_MESSAGE, data),
  getConversations: () => apiClient.get(API_CONFIG.ENDPOINTS.GET_CONVERSATIONS),

  // External Reviews APIs
  syncGoogleReviews: (businessId) => {
    const endpoint = API_CONFIG.ENDPOINTS.SYNC_GOOGLE_REVIEWS;
    if (!endpoint) return Promise.reject(new Error('Endpoint not configured'));
    return apiClient.post(buildEndpoint(endpoint, { id: businessId }) + '?ratingsOnly=true');
  },

  syncTripAdvisorReviews: (businessId) => {
    const endpoint = API_CONFIG.ENDPOINTS.SYNC_TRIPADVISOR_REVIEWS;
    if (!endpoint) return Promise.reject(new Error('Endpoint not configured'));
    return apiClient.post(buildEndpoint(endpoint, { id: businessId }));
  },

  // Manually update TripAdvisor rating
  updateTripAdvisorRating: (businessId, rating, reviewCount) => {
    return apiClient.put(`/business/${businessId}/tripadvisor-rating`, {
      rating: parseFloat(rating),
      reviewCount: parseInt(reviewCount)
    });
  },

  getAllBusinessReviews: (businessId) => {
    const endpoint = API_CONFIG.ENDPOINTS.GET_ALL_BUSINESS_REVIEWS;
    if (!endpoint) return Promise.reject(new Error('Endpoint not configured'));
    return apiClient.get(buildEndpoint(endpoint, { id: businessId }));
  },

  // Upload APIs
  uploadBusinessLogo: (formData, businessId) => {
    const url = businessId ? `/upload/business/logo?businessId=${businessId}` : '/upload/business/logo';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBusinessCover: (formData, businessId) => {
    const url = businessId ? `/upload/business/cover?businessId=${businessId}` : '/upload/business/cover';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBusinessDocuments: (formData, businessId) => {
    const url = businessId ? `/upload/business/documents?businessId=${businessId}` : '/upload/business/documents';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBusinessGallery: (formData, businessId) => {
    const url = businessId ? `/upload/business/gallery?businessId=${businessId}` : '/upload/business/gallery';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteUploadedFile: (publicId) => apiClient.delete(`/upload/${publicId}`),
  getUploadStats: () => apiClient.get('/upload/stats'),

  // Review media uploads
  uploadReviewPhotos: (formData) => {
    return apiClient.post('/upload/review/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadReviewVideos: (formData) => {
    return apiClient.post('/upload/review/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Business image management
  updateBusinessImages: (businessId, data) => apiClient.put(
    buildEndpoint(API_CONFIG.ENDPOINTS.UPDATE_BUSINESS_IMAGES, { id: businessId }),
    data
  ),

  // Support & Help APIs
  submitSupportTicket: (data) => apiClient.post('/support/ticket', data),

  // Account Settings APIs
  updateAccountSettings: (settings) => apiClient.put('/users/account-settings', settings),
  exportUserData: () => apiClient.post('/users/export-data'),
  deactivateAccount: () => apiClient.put('/users/deactivate'),
  deleteAccount: (data) => apiClient.delete('/users/account', { data }),
};

export default ApiService;
