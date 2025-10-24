import axios from 'axios';
import { store } from '../store';
import { clearCredentials } from '../slices/authSlice';

// Base API configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-api.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const state = store.getState();
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });
        
        const { accessToken } = refreshResponse.data.data;
        store.dispatch({ type: 'auth/setCredentials', payload: { accessToken } });
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        store.dispatch(clearCredentials());
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (name, email, password, role) => api.post('/auth/signup', { name, email, password, role }),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  registerPushToken: (expoPushToken) => api.post('/users/register-push-token', { expoPushToken }),
  unregisterPushToken: (expoPushToken) => api.delete('/users/register-push-token', { data: { expoPushToken } }),
  getUserById: (id) => api.get(`/users/${id}`),
};

// Business API
export const businessAPI = {
  getBusinesses: (params) => api.get('/businesses', { params }),
  getBusinessById: (id) => api.get(`/businesses/${id}`),
  createBusiness: (data) => api.post('/businesses', data),
  updateBusiness: (id, data) => api.patch(`/businesses/${id}`, data),
  getCategories: () => api.get('/businesses/categories'),
};

// Chat API
export const chatAPI = {
  getConversations: (params) => api.get('/conversations', { params }),
  createConversation: (participantId) => api.post('/conversations', { participantId }),
  getConversationById: (id) => api.get(`/conversations/${id}`),
  markConversationRead: (id) => api.patch(`/conversations/${id}/read`),
  deleteConversation: (id) => api.delete(`/conversations/${id}`),
  getMessages: (conversationId, params) => api.get('/messages', { params: { conversationId, ...params } }),
  sendMessage: (data) => api.post('/messages', data),
  editMessage: (id, data) => api.patch(`/messages/${id}`, data),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  markMessageRead: (id) => api.patch(`/messages/${id}/read`),
};

// Upload API
export const uploadAPI = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadAvatar: (formData) => api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadBusinessGallery: (formData) => api.post('/upload/business-gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteFile: (publicId) => api.delete(`/upload/${publicId}`),
  getSignedUrl: (data) => api.post('/upload/signed-url', data),
};

// Notification API
export const notificationAPI = {
  sendNotification: (data) => api.post('/notifications/send', data),
  sendNotificationToAll: (data) => api.post('/notifications/send-to-all', data),
};

export default api;
