/**
 * AI Search Service
 *
 * Handles all API calls to the AI Gateway (/ai/*).
 * Uses the same axios client as the rest of the app — auth token is
 * automatically attached by the request interceptor.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

// Derive the AI Gateway base URL from the same source as the main API.
// API base: http://192.168.1.4:5001/api  →  AI base: http://192.168.1.4:5001/ai
const AI_BASE_URL = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '/ai');

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 35000, // AI calls can take longer than regular API calls
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token
aiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap response.data (same as main apiClient)
aiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

const AISearchService = {
  /**
   * Perform an AI-powered search.
   *
   * @param {Object} params
   * @param {string}  params.query     - Natural language query
   * @param {number}  [params.latitude]
   * @param {number}  [params.longitude]
   * @param {number}  [params.radius]  - Metres (default 10000)
   * @param {number}  [params.limit]   - Results per page (default 10)
   * @param {number}  [params.page]    - Page number (default 1)
   * @param {string}  [params.sessionId]
   * @returns {Promise<AISearchResponse>}
   */
  search: async (params) => {
    return aiClient.post('/search', params);
  },

  /**
   * Check AI Gateway health status.
   */
  health: async () => {
    return aiClient.get('/health');
  },
};

export default AISearchService;
