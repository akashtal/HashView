// For EAS builds, set EXPO_PUBLIC_API_BASE_URL in eas.json
export const API_CONFIG = {
  // Local development server (ACTIVE - via Cloudflare Tunnel, wireless no cable)
  BASE_URL: 'https://diagnosis-psychiatry-counting-rings.trycloudflare.com/api',
  SOCKET_URL: 'https://diagnosis-psychiatry-counting-rings.trycloudflare.com',

  // Production URLs (commented out for now)
  // BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.hashview.co.uk/api',
  //  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'https://api.hashview.co.uk',

  // SECONDARY_BASE_URL: 'https://hashview-backend.onrender.com/api',
  // SECONDARY_SOCKET_URL: 'https://hashview-backend.onrender.com',
  TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '60000', 10),
  // API Endpoints
  ENDPOINTS: {
    // Auth
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    SEND_OTP: '/auth/send-otp',
    LOGIN_PHONE: '/auth/login-phone',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    RESET_PASSWORD_OTP: '/auth/reset-password-otp',
    GET_ME: '/auth/me',
    UPDATE_PUSH_TOKEN: '/auth/push-token',
    SEND_EMAIL_OTP: '/auth/send-email-otp',
    VERIFY_EMAIL_OTP: '/auth/verify-email-otp',

    // User
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    GET_USER_REVIEWS: '/users/reviews',
    GET_USER_COUPONS: '/users/coupons',
    GET_REWARD_HISTORY: '/users/rewards',
    UPLOAD_PROFILE_IMAGE: '/users/upload-image',

    // Business
    REGISTER_BUSINESS: '/business/register',
    GET_NEARBY_BUSINESSES: '/business/nearby',
    SEARCH_BUSINESSES: '/business/search',
    GET_BUSINESS: '/business',
    GET_BUSINESS_DASHBOARD: '/business/:id/dashboard',
    UPLOAD_DOCUMENTS: '/business/:id/documents',
    GENERATE_QR: '/business/:id/generate-qr',
    SCAN_QR_CODE: '/business/qr/scan',
    UPDATE_BUSINESS_IMAGES: '/business/:id/images',
    GET_MY_BUSINESSES: '/business/my/businesses',

    // Reviews
    CREATE_REVIEW: '/reviews',
    GET_BUSINESS_REVIEWS: '/reviews/business/:businessId',
    GET_REVIEW: '/reviews/:id',
    UPDATE_REVIEW: '/reviews/:id',
    DELETE_REVIEW: '/reviews/:id',
    MARK_HELPFUL: '/reviews/:id/helpful',

    // Coupons
    GET_COUPONS: '/coupons',
    GET_COUPON: '/coupons/:id',
    CREATE_COUPON: '/coupons',
    VERIFY_COUPON: '/coupons/verify',
    REDEEM_COUPON: '/coupons/:id/redeem',
    GET_BUSINESS_COUPONS: '/coupons/business/:businessId',

    // Notifications
    GET_NOTIFICATIONS: '/notifications',
    MARK_AS_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',

    // Admin
    GET_DASHBOARD_STATS: '/admin/dashboard',
    GET_ALL_USERS: '/admin/users',
    GET_ALL_BUSINESSES: '/admin/businesses',
    UPDATE_BUSINESS_KYC: '/admin/businesses/:id/kyc',
    UPDATE_USER_STATUS: '/admin/users/:id/status',
    GET_ALL_REVIEWS: '/admin/reviews',
    SEND_NOTIFICATION: '/admin/notifications/send',

    // Chat
    GET_CHAT_HISTORY: '/chat/:userId',
    SEND_MESSAGE: '/chat',
    GET_CONVERSATIONS: '/chat/conversations',

    // External Reviews
    SYNC_GOOGLE_REVIEWS: '/external-reviews/:id/sync-google-reviews',
    SYNC_TRIPADVISOR_REVIEWS: '/external-reviews/:id/sync-tripadvisor-reviews',
    GET_ALL_BUSINESS_REVIEWS: '/external-reviews/:id/all-reviews',
  },
};
export default API_CONFIG;
