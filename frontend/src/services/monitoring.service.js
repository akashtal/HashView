/**
 * HashView Monitoring Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Single import point for all observability tools:
 *   • Sentry       → crash reporting, error tracking, session replay
 *   • PostHog      → product analytics, funnel tracking, rage-tap detection
 *   • Firebase     → analytics events, Crashlytics native crash reporting
 *
 * Usage:
 *   import Monitoring from '../services/monitoring.service';
 *
 *   Monitoring.identifyUser(user);          // call after login
 *   Monitoring.clearUser();                 // call after logout
 *   Monitoring.track('review_submitted', { businessId, rating });
 *   Monitoring.captureError(error, { feature: 'review', screen: 'ReviewPage' });
 *   Monitoring.breadcrumb('Submit button tapped', 'ui.click');
 */

import * as Sentry from '@sentry/react-native';

// ─── PostHog — lazy import so it doesn't crash if not installed yet ───────────
let PostHog = null;
try {
  PostHog = require('posthog-react-native').PostHog;
} catch (e) {
  // PostHog not yet installed — run: npm install posthog-react-native
}

// ─── Firebase Analytics — lazy import ─────────────────────────────────────────
let analytics = null;
try {
  analytics = require('@react-native-firebase/analytics').default;
} catch (e) {
  // Firebase Analytics not available
}

// ─── Firebase Crashlytics — lazy import ──────────────────────────────────────
let crashlytics = null;
try {
  crashlytics = require('@react-native-firebase/crashlytics').default;
} catch (e) {
  // Crashlytics not yet installed — run: npm install @react-native-firebase/crashlytics
}

// ─── PostHog singleton instance ───────────────────────────────────────────────
let posthogClient = null;

export const initPostHog = () => {
  if (!PostHog) return;
  try {
    posthogClient = new PostHog(
      process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '',
      { host: 'https://eu.posthog.com' } // EU data residency (GDPR-friendly)
    );
  } catch (e) {
    console.warn('[Monitoring] PostHog init failed:', e.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER IDENTITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call immediately after a successful login or session restore.
 * Binds all subsequent errors and events to this specific user across
 * Sentry, PostHog, and Firebase Crashlytics.
 *
 * @param {Object} user - The user object from Redux auth state
 */
const identifyUser = (user) => {
  if (!user || user.isGuest) {
    clearUser();
    return;
  }

  const userId = user._id?.toString() || user.id?.toString() || 'unknown';
  const userEmail = user.email || '';
  const userName = user.name || '';
  const userRole = user.role || 'customer';

  // ── Sentry: tag all future errors with this user ──────────────────────────
  Sentry.setUser({
    id: userId,
    email: userEmail,
    username: userName,
    role: userRole,
  });

  // ── PostHog: identify for funnel analysis ────────────────────────────────
  if (posthogClient) {
    try {
      posthogClient.identify(userId, {
        email: userEmail,
        name: userName,
        role: userRole,
      });
    } catch (e) { /* silent */ }
  }

  // ── Firebase Crashlytics: attach user to native crash reports ────────────
  if (crashlytics) {
    try {
      crashlytics().setUserId(userId);
      crashlytics().setAttribute('role', userRole);
      crashlytics().setAttribute('email', userEmail);
    } catch (e) { /* silent */ }
  }

  // ── Firebase Analytics: set user properties ──────────────────────────────
  if (analytics) {
    try {
      analytics().setUserId(userId);
      analytics().setUserProperties({ role: userRole });
    } catch (e) { /* silent */ }
  }
};

/**
 * Call on logout to reset all user context across all platforms.
 */
const clearUser = () => {
  Sentry.setUser(null);

  if (posthogClient) {
    try { posthogClient.reset(); } catch (e) { /* silent */ }
  }

  if (crashlytics) {
    try { crashlytics().setUserId(''); } catch (e) { /* silent */ }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CAPTURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Capture a handled exception (non-crash errors you explicitly catch).
 * Sends to Sentry and logs a crash in Firebase Crashlytics.
 *
 * @param {Error} error  - The caught Error object
 * @param {Object} context - Extra tags/data: { feature, screen, userId, extra }
 */
const captureError = (error, context = {}) => {
  const { feature, screen, extra = {} } = context;

  // Sentry
  Sentry.withScope((scope) => {
    if (feature) scope.setTag('feature', feature);
    if (screen) scope.setTag('screen', screen);
    scope.setExtras(extra);
    Sentry.captureException(error);
  });

  // Firebase Crashlytics (non-fatal)
  if (crashlytics) {
    try {
      crashlytics().recordError(error);
      if (feature) crashlytics().setAttribute('last_feature', feature);
      if (screen) crashlytics().setAttribute('last_screen', screen);
    } catch (e) { /* silent */ }
  }

  // PostHog event so you can correlate errors with user journeys
  track('error_captured', {
    error_message: error?.message || String(error),
    feature,
    screen,
  });
};

/**
 * Capture a warning-level non-exception message (e.g. "search returned 0 results").
 *
 * @param {string} message - Human-readable description
 * @param {Object} context - Extra tags/data
 */
const captureMessage = (message, context = {}) => {
  const { level = 'warning', feature, screen, extra = {} } = context;

  Sentry.withScope((scope) => {
    if (feature) scope.setTag('feature', feature);
    if (screen) scope.setTag('screen', screen);
    scope.setExtras(extra);
    Sentry.captureMessage(message, level);
  });

  if (crashlytics) {
    try { crashlytics().log(message); } catch (e) { /* silent */ }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BREADCRUMBS  (User Action Timeline)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a user action as a breadcrumb. When an error occurs, Sentry will show
 * a chronological trail of these breadcrumbs so you see EXACTLY what led to it.
 *
 * @param {string} message  - e.g. "Tapped Submit Review button"
 * @param {string} category - e.g. "ui.click", "navigation", "action"
 * @param {Object} data     - Any additional context
 */
const breadcrumb = (message, category = 'action', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT ANALYTICS EVENTS  (PostHog + Firebase)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track a key product event. This powers your funnels and dashboards.
 *
 * @param {string} eventName - Snake_case name: 'review_submitted', 'search_performed'
 * @param {Object} properties - Any extra properties to attach
 */
const track = (eventName, properties = {}) => {
  // PostHog
  if (posthogClient) {
    try {
      posthogClient.capture(eventName, properties);
    } catch (e) { /* silent */ }
  }

  // Firebase Analytics
  if (analytics) {
    try {
      // Firebase event names must be snake_case ≤40 chars and match [a-zA-Z0-9_]
      const safeEventName = eventName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 40);
      // Firebase only accepts string/number/boolean property values
      const safeProps = {};
      Object.entries(properties).forEach(([k, v]) => {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          safeProps[k.slice(0, 24)] = typeof v === 'string' ? v.slice(0, 100) : v;
        }
      });
      analytics().logEvent(safeEventName, safeProps);
    } catch (e) { /* silent */ }
  }
};

/**
 * Track a screen view (automatic navigation tracking).
 *
 * @param {string} screenName - The name of the screen, e.g. 'BusinessDetailScreen'
 * @param {string} screenClass - Optional class name
 */
const trackScreen = (screenName, screenClass = '') => {
  // Sentry breadcrumb
  breadcrumb(`Navigated to ${screenName}`, 'navigation', { screenName });

  // Firebase Analytics
  if (analytics) {
    try {
      analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (e) { /* silent */ }
  }

  // PostHog screen event
  if (posthogClient) {
    try {
      posthogClient.screen(screenName);
    } catch (e) { /* silent */ }
  }

  // Crashlytics: track last screen user was on before a crash
  if (crashlytics) {
    try {
      crashlytics().setAttribute('last_screen', screenName);
    } catch (e) { /* silent */ }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BUILT EVENTS (HashView-specific)
// These cover all the critical user journeys you want to monitor.
// ─────────────────────────────────────────────────────────────────────────────

const Events = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  loginStarted: (method) => {
    breadcrumb(`Login started via ${method}`, 'auth');
    track('login_started', { method });
  },
  loginSuccess: (user, method) => {
    breadcrumb(`Login succeeded via ${method}`, 'auth');
    identifyUser(user);
    track('login_success', { method, role: user?.role });
    if (analytics) { try { analytics().logLogin({ method }); } catch (e) {} }
  },
  loginFailed: (method, reason) => {
    track('login_failed', { method, reason });
    captureMessage(`Login failed: ${reason}`, { feature: 'auth', level: 'warning' });
  },
  registerSuccess: (user, method) => {
    identifyUser(user);
    track('register_success', { method, role: user?.role });
    if (analytics) { try { analytics().logSignUp({ method }); } catch (e) {} }
  },
  logout: () => {
    track('logout');
    clearUser();
  },

  // ─── Search & AI ───────────────────────────────────────────────────────────
  searchPerformed: (query, filtersApplied = false) => {
    breadcrumb(`Search: "${query}"`, 'action', { query, filtersApplied });
    track('search_performed', { query: query?.slice(0, 100), filters_applied: filtersApplied });
  },
  searchResult: (query, resultCount, accuracy) => {
    track('search_result', {
      query: query?.slice(0, 100),
      result_count: resultCount,
      accuracy,
    });
    if (resultCount === 0) {
      captureMessage(`Search returned 0 results for "${query}"`, {
        feature: 'search',
        level: 'warning',
        extra: { query, accuracy },
      });
    }
  },
  aiChatSent: (messageLength) => {
    breadcrumb('AI chat message sent', 'action', { messageLength });
    track('ai_chat_sent', { message_length: messageLength });
  },
  aiSearchFailed: (query, error) => {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      feature: 'ai_search',
      extra: { query },
    });
    track('ai_search_failed', { query: query?.slice(0, 100), error: error?.message });
  },

  // ─── Review ────────────────────────────────────────────────────────────────
  reviewStarted: (businessId, businessName) => {
    breadcrumb('Review flow started', 'action', { businessId, businessName });
    track('review_started', { business_id: businessId, business_name: businessName?.slice(0, 50) });
  },
  reviewSubmitAttempt: (businessId, rating) => {
    breadcrumb('Submit review tapped', 'ui.click', { businessId, rating });
    track('review_submit_attempt', { business_id: businessId, rating });
  },
  reviewSubmitSuccess: (businessId, rating) => {
    breadcrumb('Review submitted successfully', 'action', { businessId, rating });
    track('review_submit_success', { business_id: businessId, rating });
  },
  reviewSubmitFailed: (businessId, error) => {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      feature: 'review_submission',
      extra: { businessId },
    });
    track('review_submit_failed', {
      business_id: businessId,
      error: error?.message,
    });
  },

  // ─── Location ──────────────────────────────────────────────────────────────
  locationGranted: () => track('location_permission_granted'),
  locationDenied: () => {
    track('location_permission_denied');
    captureMessage('User denied location permission', {
      feature: 'location',
      level: 'warning',
    });
  },
  locationFailed: (error) => {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      feature: 'location',
    });
    track('location_fetch_failed', { error: error?.message });
  },
  geofenceViolation: (businessId, distanceMeters, allowedMeters) => {
    captureMessage(`Geofence violation: ${distanceMeters}m > ${allowedMeters}m`, {
      feature: 'geofencing',
      level: 'warning',
      extra: { businessId, distanceMeters, allowedMeters },
    });
    track('geofence_violation', {
      business_id: businessId,
      distance_m: distanceMeters,
      allowed_m: allowedMeters,
    });
  },

  // ─── Business ──────────────────────────────────────────────────────────────
  businessViewed: (businessId, businessName) => {
    breadcrumb(`Viewed business: ${businessName}`, 'navigation', { businessId });
    track('business_viewed', { business_id: businessId });
    if (analytics) {
      try {
        analytics().logViewItem({
          items: [{ item_id: businessId, item_name: businessName?.slice(0, 50) }],
        });
      } catch (e) {}
    }
  },
  businessRegistrationStarted: () => {
    breadcrumb('Business registration flow started', 'action');
    track('business_registration_started');
  },
  businessRegistrationSuccess: (businessId) => {
    track('business_registration_success', { business_id: businessId });
  },
  businessRegistrationFailed: (step, error) => {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      feature: 'business_registration',
      extra: { step },
    });
    track('business_registration_failed', { step, error: error?.message });
  },

  // ─── Rewards & Coupons ─────────────────────────────────────────────────────
  couponRedeemed: (couponId, businessId) => {
    track('coupon_redeemed', { coupon_id: couponId, business_id: businessId });
  },
  rewardClaimed: (businessId, rewardType) => {
    track('reward_claimed', { business_id: businessId, reward_type: rewardType });
  },

  // ─── Filters & Maps ────────────────────────────────────────────────────────
  filterApplied: (filterType, filterValue) => {
    breadcrumb(`Filter applied: ${filterType}=${filterValue}`, 'action');
    track('filter_applied', { filter_type: filterType, filter_value: String(filterValue).slice(0, 50) });
  },
  mapOpened: () => track('map_opened'),

  // ─── API / Network ─────────────────────────────────────────────────────────
  apiError: (endpoint, statusCode, message) => {
    captureMessage(`API Error ${statusCode} on ${endpoint}`, {
      feature: 'api',
      level: statusCode >= 500 ? 'error' : 'warning',
      extra: { endpoint, statusCode, message },
    });
    track('api_error', {
      endpoint: endpoint?.slice(0, 100),
      status_code: statusCode,
      error: message?.slice(0, 200),
    });
  },
  networkError: (endpoint) => {
    track('network_error', { endpoint: endpoint?.slice(0, 100) });
    captureMessage(`Network error on ${endpoint}`, { feature: 'network', level: 'warning' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const Monitoring = {
  init: initPostHog,
  identifyUser,
  clearUser,
  captureError,
  captureMessage,
  breadcrumb,
  track,
  trackScreen,
  Events,
};

export default Monitoring;
