/**
 * Referral Service
 *
 * Thin wrapper — delegates to ApiService (same axios client with auth token,
 * failover server, and error interceptors as the rest of the app).
 *
 * Usage:
 *   import ReferralService from '../services/referral.service';
 *   const { referral } = await ReferralService.getMyReferral();
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

const BASE = `${API_CONFIG.BASE_URL}/referral`;

// Custom axios instance (avoids global api.service.js error toasts)
const client = axios.create({ baseURL: BASE, timeout: API_CONFIG.TIMEOUT });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// ─── AsyncStorage key for deep-link referral codes ────────────────────────────
export const REFERRAL_CODE_STORAGE_KEY = '@hashview:pendingReferralCode';

const ReferralService = {
  /**
   * Get the authenticated user's referral code + link.
   * Generates them server-side if they don't yet exist.
   * @returns {{ success, referral: { code, link, invitedBy, invitedAt } }}
   */
  getMyReferral: () => client.get('/me'),

  /**
   * Validate that a referral code exists.
   * @param {string} code
   * @returns {{ success, valid, referrerName }}
   */
  validateCode: (code) => client.post('/validate', { code }),

  /**
   * Regenerate the authenticated user's referral code.
   * @returns {{ success, referral: { code, link } }}
   */
  regenerateCode: () => client.post('/generate'),

  // ─── Deep link helpers ──────────────────────────────────────────────────────

  /**
   * Extract a referral code from an invite URL.
   * e.g. "https://hashview.app/invite/AKASH9274" → "AKASH9274"
   */
  extractCodeFromUrl: (url) => {
    if (!url) return null;
    const match = url.match(/\/invite\/([A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : null;
  },

  /**
   * Persist a pending referral code so the registration screen can read it.
   */
  storePendingCode: (code) =>
    AsyncStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code),

  /**
   * Retrieve and clear the stored pending referral code.
   * Returns null if none exists.
   */
  consumePendingCode: async () => {
    const code = await AsyncStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
    if (code) await AsyncStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
    return code;
  },
};

export default ReferralService;
