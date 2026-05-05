/**
 * HashView Web API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the mobile app's api.service.js exactly, adapted for the web:
 *  - AsyncStorage  → cookie / localStorage
 *  - React Native  → browser environment
 *  - Failover logic preserved (primary → secondary on network error)
 *
 * Base URL: https://api.hashview.co.uk/api
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  User,
  BusinessOwner,
  Business,
  BusinessListResponse,
  BusinessDashboardData,
  BusinessUpdate,
  NearbyBusinessesParams,
  SearchBusinessesParams,
  Review,
  ReviewsResponse,
  Coupon,
  BusinessCoupon,
  CouponTemplate,
  RedemptionStats,
  Notification,
  NotificationsResponse,
  Category,
} from './types';

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIMARY_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.hashview.co.uk/api';

const SECONDARY_BASE_URL =
  process.env.NEXT_PUBLIC_API_SECONDARY_URL || '';

const TIMEOUT = 60_000;

// Token helpers — persisted in both localStorage (fast client access) and
// a cookie (so Next.js middleware can verify auth for server-side redirects).
const TOKEN_KEY = 'hv_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches backend JWT_EXPIRES_IN)

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    // Also set a cookie so middleware.ts can check auth on protected routes
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  },
  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    // Expire the cookie
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  },
};

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: PRIMARY_BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach Bearer token ────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — error handling + failover ────────────────────────

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Failover: switch to secondary on network error (same as mobile)
    if (
      !originalRequest._retry &&
      SECONDARY_BASE_URL &&
      (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))
    ) {
      console.warn('⚠️ Primary server unreachable. Switching to secondary...');
      originalRequest._retry = true;
      originalRequest.baseURL = SECONDARY_BASE_URL;
      return apiClient(originalRequest);
    }

    // 401 → clear token, redirect to login
    if (error.response?.status === 401) {
      tokenStorage.remove();
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isAppRoute =
          path.startsWith('/explore') ||
          path.startsWith('/dashboard') ||
          path.startsWith('/account') ||
          path.startsWith('/favorites') ||
          path.startsWith('/business/');
        if (isAppRoute) {
          window.location.href = '/login';
        }
      }
    }

    const data = error.response?.data;
    let message = data?.message || error.message || 'Something went wrong';
    if (data?.reason) message = `${message} ${data.reason}`;

    return Promise.reject(new Error(message));
  }
);

// ─── URL builder helper ───────────────────────────────────────────────────────

const build = (template: string, params: Record<string, string | number>) => {
  let url = template;
  Object.entries(params).forEach(([k, v]) => {
    url = url.replace(`:${k}`, String(v));
  });
  return url;
};

// ─── API Service ──────────────────────────────────────────────────────────────

const ApiService = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  register: (data: RegisterPayload) =>
    apiClient.post<never, AuthResponse>('/auth/register', data),

  login: (data: LoginCredentials) =>
    apiClient.post<never, AuthResponse>('/auth/login', data),

  sendOTP: (data: { phone: string }) =>
    apiClient.post('/auth/send-otp', data),

  loginWithPhone: (data: { phone: string; otp: string }) =>
    apiClient.post<never, AuthResponse>('/auth/login-phone', data),

  forgotPassword: (data: { email: string }) =>
    apiClient.post('/auth/forgot-password', data),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post('/auth/reset-password', data),

  resetPasswordWithOTP: (data: { phone: string; otp: string; password: string }) =>
    apiClient.post('/auth/reset-password-otp', data),

  getMe: () =>
    apiClient.get<never, { user: AuthResponse['user'] }>('/auth/me'),

  sendEmailOTP: (data: { email: string }) =>
    apiClient.post('/auth/send-email-otp', data),

  verifyEmailOTP: (data: { email: string; otp: string }) =>
    apiClient.post('/auth/verify-email-otp', data),

  // ── User ──────────────────────────────────────────────────────────────────
  getProfile: () =>
    apiClient.get<never, { user: User }>('/users/profile'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<never, { user: User }>('/users/profile', data),

  uploadProfileImage: (formData: FormData) =>
    apiClient.post('/users/upload-profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/users/change-password', data),

  getUserReviews: (params?: Record<string, unknown>) =>
    apiClient.get<never, ReviewsResponse>('/users/reviews', { params }),

  getUserCoupons: (params?: Record<string, unknown>) =>
    apiClient.get<never, { coupons: Coupon[] }>('/users/coupons', { params }),

  getRewardHistory: (params?: Record<string, unknown>) =>
    apiClient.get('/users/rewards', { params }),

  updateAccountSettings: (settings: Record<string, boolean>) =>
    apiClient.put('/users/account-settings', settings),

  exportUserData: () =>
    apiClient.post('/users/export-data'),

  deactivateAccount: () =>
    apiClient.put('/users/deactivate'),

  deleteAccount: (data: { password: string }) =>
    apiClient.delete('/users/account', { data }),

  // ── Favorites ─────────────────────────────────────────────────────────────
  toggleFavoriteBusiness: (businessId: string) =>
    apiClient.put(`/users/favorites/${businessId}`),

  getFavoriteBusinesses: () =>
    apiClient.get<never, { favorites: Business[] }>('/users/favorites'),

  // ── Business (Public) ─────────────────────────────────────────────────────
  getAllActiveBusinesses: (params?: Record<string, unknown>) =>
    apiClient.get<never, BusinessListResponse>('/business/all', { params }),

  getNearbyBusinesses: (params: NearbyBusinessesParams) =>
    apiClient.get<never, BusinessListResponse>('/business/nearby', { params }),

  searchBusinesses: (params: SearchBusinessesParams) =>
    apiClient.get<never, BusinessListResponse>('/business/search', { params }),

  getBusiness: (id: string) =>
    apiClient.get<never, { business: Business }>(`/business/${id}`),

  trackBusinessVisit: (businessId: string) =>
    apiClient.post(`/business/${businessId}/track-visit`),

  // ── Business (Owner) ──────────────────────────────────────────────────────
  registerBusiness: (data: Record<string, unknown>) =>
    apiClient.post<never, { business: Business }>('/business/register', data),

  getMyBusinesses: () =>
    apiClient.get<never, { businesses: Business[] }>('/business/my/businesses'),

  getBusinessDashboard: (id: string) =>
    apiClient.get<never, BusinessDashboardData>(build('/business/:id/dashboard', { id })),

  updateBusiness: (id: string, data: Partial<Business>) =>
    apiClient.put<never, { business: Business }>(`/business/${id}`, data),

  uploadBusinessLogo: (formData: FormData, businessId?: string) => {
    const url = businessId
      ? `/upload/business/logo?businessId=${businessId}`
      : '/upload/business/logo';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadBusinessCover: (formData: FormData, businessId?: string) => {
    const url = businessId
      ? `/upload/business/cover?businessId=${businessId}`
      : '/upload/business/cover';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadBusinessGallery: (formData: FormData, businessId?: string) => {
    const url = businessId
      ? `/upload/business/gallery?businessId=${businessId}`
      : '/upload/business/gallery';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadBusinessDocuments: (formData: FormData, businessId?: string) => {
    const url = businessId
      ? `/upload/business/documents?businessId=${businessId}`
      : '/upload/business/documents';
    return apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateBusinessImages: (businessId: string, data: Record<string, unknown>) =>
    apiClient.put(build('/business/:id/images', { id: businessId }), data),

  generateQR: (id: string) =>
    apiClient.post(build('/business/:id/generate-qr', { id })),

  uploadDocuments: (id: string, formData: FormData) =>
    apiClient.post(build('/business/:id/documents', { id }), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteUploadedFile: (publicId: string) =>
    apiClient.delete(`/upload/${publicId}`),

  // ── Business Claim ────────────────────────────────────────────────────────
  claimBusiness: (businessId: string, data: Record<string, unknown>) =>
    apiClient.post(`/business/${businessId}/claim`, data),

  uploadClaimDocuments: (businessId: string, formData: FormData) =>
    apiClient.post(`/business/${businessId}/claim/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  sendClaimPhoneOtp: (businessId: string) =>
    apiClient.post(`/business/${businessId}/claim/send-phone-otp`),

  verifyClaimPhoneOtp: (businessId: string, otp: string) =>
    apiClient.post(`/business/${businessId}/claim/verify-phone-otp`, { otp }),

  // ── Reviews ───────────────────────────────────────────────────────────────
  getBusinessReviews: (businessId: string, params?: Record<string, unknown>) =>
    apiClient.get<never, ReviewsResponse>(
      build('/reviews/business/:businessId', { businessId }),
      { params }
    ),

  getReview: (id: string) =>
    apiClient.get<never, { review: Review }>(build('/reviews/:id', { id })),

  markHelpful: (id: string) =>
    apiClient.post(build('/reviews/:id/helpful', { id })),

  getAllBusinessReviews: (businessId: string) =>
    apiClient.get(`/external-reviews/${businessId}/all-reviews`),

  // ── External Reviews ──────────────────────────────────────────────────────
  syncGoogleReviews: (businessId: string) =>
    apiClient.post(`/external-reviews/${businessId}/sync-google-reviews?ratingsOnly=true`),

  syncTripAdvisorReviews: (businessId: string) =>
    apiClient.post(`/external-reviews/${businessId}/sync-tripadvisor-reviews`),

  updateTripAdvisorRating: (businessId: string, rating: number, reviewCount: number) =>
    apiClient.put(`/business/${businessId}/tripadvisor-rating`, { rating, reviewCount }),

  // ── Coupons (review-reward) ────────────────────────────────────────────────
  getCoupons: (params?: Record<string, unknown>) =>
    apiClient.get<never, { coupons: Coupon[] }>('/coupons', { params }),

  getCoupon: (id: string) =>
    apiClient.get<never, { coupon: Coupon }>(build('/coupons/:id', { id })),

  getBusinessCoupons: (businessId: string) =>
    apiClient.get<never, { coupons: Coupon[] }>(
      build('/coupons/business/:businessId', { businessId })
    ),

  getBusinessCouponTemplate: (businessId: string) =>
    apiClient.get<never, { template: CouponTemplate }>(`/coupons/template/${businessId}`),

  createCouponTemplate: (data: Partial<CouponTemplate>) =>
    apiClient.post('/coupons/template', data),

  // ── Business Coupons (promotional) ────────────────────────────────────────
  getBusinessCouponsList: (businessId: string) =>
    apiClient.get<never, { coupons: BusinessCoupon[] }>(
      `/business-coupons/business/${businessId}`
    ),

  createBusinessCoupon: (data: Partial<BusinessCoupon>) =>
    apiClient.post<never, { coupon: BusinessCoupon }>('/business-coupons', data),

  updateBusinessCoupon: (id: string, data: Partial<BusinessCoupon>) =>
    apiClient.put<never, { coupon: BusinessCoupon }>(`/business-coupons/${id}`, data),

  deleteBusinessCoupon: (id: string) =>
    apiClient.delete(`/business-coupons/${id}`),

  toggleCouponStatus: (id: string) =>
    apiClient.patch(`/business-coupons/${id}/toggle-status`),

  scanAndRedeemCoupon: (qrCodeData: string) =>
    apiClient.post('/business-coupons/scan-redeem', { qrCodeData }),

  getRedemptionStats: (businessId: string) =>
    apiClient.get<never, RedemptionStats>(`/business-coupons/redemption-stats/${businessId}`),

  // ── Business Updates (offers / announcements) ─────────────────────────────
  getBusinessUpdates: (businessId: string, params?: Record<string, unknown>) =>
    apiClient.get<never, { updates: BusinessUpdate[] }>(
      `/business/${businessId}/updates`,
      { params }
    ),

  createBusinessUpdate: (data: Partial<BusinessUpdate> & { business: string }) =>
    apiClient.post<never, { update: BusinessUpdate }>(`/business/${data.business}/updates`, data),

  updateBusinessUpdate: (id: string, data: Partial<BusinessUpdate>) =>
    apiClient.put<never, { update: BusinessUpdate }>(`/updates/${id}`, data),

  deleteBusinessUpdate: (id: string) =>
    apiClient.delete(`/updates/${id}`),

  // ── Categories ────────────────────────────────────────────────────────────
  getCategories: () =>
    apiClient.get<never, { categories: Category[] }>('/categories'),

  getCategory: (id: string) =>
    apiClient.get<never, { category: Category }>(`/categories/${id}`),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: (params?: Record<string, unknown>) =>
    apiClient.get<never, NotificationsResponse>('/notifications', { params }),

  markAsRead: (id: string) =>
    apiClient.put(build('/notifications/:id/read', { id })),

  markAllRead: () =>
    apiClient.put('/notifications/read-all'),

  // ── Support ───────────────────────────────────────────────────────────────
  submitSupportTicket: (data: Record<string, unknown>) =>
    apiClient.post('/support/ticket', data),

  submitContactForm: (data: { name: string; email: string; subject: string; message: string }) =>
    apiClient.post('/contact', data),


  // ── Subscription (Stripe) ─────────────────────────────────────────────────
  getSubscriptionStatus: () =>
    apiClient.get<never, {
      isPro: boolean;
      subscriptionEnabled: boolean;
      hasFreeTrial: boolean;
      freeTrial: { updatesUsed: number; maxFreeUpdates: number; remaining: number };
      subscription: {
        status: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
        plan: string | null;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
      };
    }>('/subscription/status'),

  createSubscriptionCheckout: (planType: 'monthly' | '6month' | 'yearly' = 'monthly') =>
    apiClient.post<never, { url: string }>('/subscription/create-checkout-session', { planType }),

  createSubscriptionPortal: () =>
    apiClient.post<never, { url: string }>('/subscription/create-portal-session'),

  // ── Upload (misc) ─────────────────────────────────────────────────────────
  getUploadStats: () =>
    apiClient.get('/upload/stats'),

  // ── Admin ─────────────────────────────────────────────────────────────────
  getDashboardStats: () =>
    apiClient.get('/admin/dashboard'),

  adminGetAllBusinesses: () =>
    apiClient.get('/admin/businesses'),

  adminGetBusiness: (id: string) =>
    apiClient.get(`/admin/businesses/${id}`),

  adminUpdateBusiness: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/businesses/${id}`, data),

  adminUpdateBusinessKYC: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/businesses/${id}/kyc`, data),

  adminDeleteBusiness: (id: string) =>
    apiClient.delete(`/admin/businesses/${id}`),

  adminGetAllUsers: () =>
    apiClient.get('/admin/users'),

  adminUpdateUserStatus: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/users/${id}/status`, data),

  adminDeleteUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`),

  adminSuspendUser: (id: string, data: Record<string, unknown>) =>
    apiClient.post(`/admin/users/${id}/suspend`, data),

  adminGetAllReviews: () =>
    apiClient.get('/admin/reviews'),

  adminUpdateReviewStatus: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/reviews/${id}/status`, data),

  adminGetAllCoupons: () =>
    apiClient.get('/admin/coupons'),

  adminToggleCouponStatus: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/admin/coupons/${id}/status`, data),

  adminDeleteCoupon: (id: string) =>
    apiClient.delete(`/admin/coupons/${id}`),

  sendAdminNotification: (data: Record<string, unknown>) =>
    apiClient.post('/admin/notifications/send', data),

  getBusinessClaims: (params?: Record<string, unknown>) =>
    apiClient.get('/business/admin/claims', { params }),

  reviewBusinessClaim: (businessId: string, decision: string, rejectionReason?: string) =>
    apiClient.put(`/business/${businessId}/claim/review`, { decision, rejectionReason }),

  // ── Category Management (admin) ───────────────────────────────────────────
  createCategory: (data: Partial<Category>) =>
    apiClient.post('/categories', data),

  updateCategory: (id: string, data: Partial<Category>) =>
    apiClient.put(`/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiClient.delete(`/categories/${id}`),
};

export default ApiService;

// Named export for direct use in hooks
export { apiClient };

// Re-export types used by consumers
export type { AuthResponse, LoginCredentials, RegisterPayload, User, BusinessOwner };
