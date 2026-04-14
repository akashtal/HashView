import axios from 'axios';

// Create axios instance
const api = axios.create({
  // In production, use VITE_API_URL from .env.production
  // In development, use proxy (configured in vite.config.js)
  baseURL: import.meta.env.PROD && import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`  // Production: https://your-backend.com/api
    : '/api',                                  // Development: uses Vite proxy
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

