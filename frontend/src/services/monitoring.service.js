/**
 * HashView Monitoring Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Single import point for all observability tools:
 *   • Sentry          → crash reporting, error tracking, session replay
 *   • PostHog         → product analytics, funnel tracking (via PostHogProvider)
 *   • Firebase        → analytics events
 *   • Crashlytics     → native Android/iOS crash reporting
 */

import * as Sentry from '@sentry/react-native';

try {
  require('@react-native-firebase/app');
} catch (e) {
  // Firebase app not available
}

// ─── Firebase Analytics — namespaced API ────────────────────────────────────
let firebaseAnalytics = null;
try {
  firebaseAnalytics = require('@react-native-firebase/analytics').default;
} catch (e) {
  // Firebase Analytics not available
}

// ─── Firebase Crashlytics — namespaced API ───────────────────────────────────
let firebaseCrashlytics = null;
try {
  firebaseCrashlytics = require('@react-native-firebase/crashlytics').default;
} catch (e) {
  // Crashlytics not available
}

// ─── PostHog client ref — set by App.js via Monitoring.setPostHogClient() ─────
// PostHogProvider in App.js owns the real client; we store a reference here
// so the service layer can call posthog.capture() outside of React components.
let posthogClient = null;
export const setPostHogClient = (client) => {
  posthogClient = client;
};

// ─────────────────────────────────────────────────────────────────────────────
// INIT — called once from App.js useEffect at app startup
// ─────────────────────────────────────────────────────────────────────────────
const init = () => {
  // ── 1. Firebase Crashlytics ────────────────────────────────────────────────
  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().setCrashlyticsCollectionEnabled(true);
      firebaseCrashlytics().setAttribute('app_name', 'HashView');
      firebaseCrashlytics().setAttribute('platform', 'react-native');
      firebaseCrashlytics().log('HashView app initialized');
      console.log('[Monitoring] Firebase Crashlytics enabled ✅');
    } catch (e) {
      console.warn('[Monitoring] Crashlytics init error:', e.message);
    }
  }

  // ── 2. Firebase Analytics ──────────────────────────────────────────────────
  if (firebaseAnalytics) {
    try {
      firebaseAnalytics().setAnalyticsCollectionEnabled(true);
      console.log('[Monitoring] Firebase Analytics enabled ✅');
    } catch (e) {
      console.warn('[Monitoring] Firebase Analytics init error:', e.message);
    }
  }

  // ── 3. Sentry — send startup breadcrumb + dev verification event ───────────
  // This activates the Sentry react-native project dashboard.
  // In dev mode it also sends one explicit message so you can confirm
  // the connection in sentry.io → react-native project → Issues immediately.
  try {
    Sentry.addBreadcrumb({
      message: 'HashView app started',
      category: 'app.lifecycle',
      level: 'info',
    });
    if (__DEV__) {
      Sentry.captureMessage('[DEV] HashView frontend SDK connected and working', 'debug');
      console.log('[Monitoring] Sentry frontend — test event sent ✅');
    }
  } catch (e) {
    console.warn('[Monitoring] Sentry breadcrumb error:', e.message);
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
    } catch (e) {
      /* silent */
    }
  }

  // ── Firebase Crashlytics: attach user to native crash reports ────────────
  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().setUserId(userId);
      firebaseCrashlytics().setAttribute('role', userRole);
      firebaseCrashlytics().setAttribute('email', userEmail);
    } catch (e) {
      /* silent */
    }
  }

  // ── Firebase Analytics: set user properties ──────────────────────────────
  if (firebaseAnalytics) {
    try {
      firebaseAnalytics().setUserId(userId);
      firebaseAnalytics().setUserProperties({ role: userRole });
    } catch (e) {
      /* silent */
    }
  }
};

/**
 * Call on logout to reset all user context across all platforms.
 */
const clearUser = () => {
  Sentry.setUser(null);

  if (posthogClient) {
    try {
      posthogClient.reset();
    } catch (e) {
      /* silent */
    }
  }

  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().setUserId('');
    } catch (e) {
      /* silent */
    }
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
  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().recordError(error);
      if (feature) firebaseCrashlytics().setAttribute('last_feature', feature);
      if (screen) firebaseCrashlytics().setAttribute('last_screen', screen);
    } catch (e) {
      /* silent */
    }
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

  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().log(message);
    } catch (e) {
      /* silent */
    }
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
    } catch (e) {
      /* silent */
    }
  }

  // Firebase Analytics
  if (firebaseAnalytics) {
    try {
      const safeEventName = eventName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
      const safeProps = {};
      Object.entries(properties).forEach(([k, v]) => {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          safeProps[k.slice(0, 24)] = typeof v === 'string' ? v.slice(0, 100) : v;
        }
      });
      firebaseAnalytics().logEvent(safeEventName, safeProps);
    } catch (e) {
      /* silent */
    }
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
  if (firebaseAnalytics) {
    try {
      firebaseAnalytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (e) {
      /* silent */
    }
  }

  // PostHog screen event
  if (posthogClient) {
    try {
      posthogClient.screen(screenName);
    } catch (e) {
      /* silent */
    }
  }

  // Crashlytics: track last screen user was on before a crash
  if (firebaseCrashlytics) {
    try {
      firebaseCrashlytics().setAttribute('last_screen', screenName);
    } catch (e) {
      /* silent */
    }
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
    if (firebaseAnalytics) {
      try {
        firebaseAnalytics().logEvent('login', { method });
      } catch (e) {}
    }
  },
  loginFailed: (method, reason) => {
    track('login_failed', { method, reason });
    captureMessage(`Login failed: ${reason}`, { feature: 'auth', level: 'warning' });
  },
  registerSuccess: (user, method) => {
    identifyUser(user);
    track('register_success', { method, role: user?.role });
    if (firebaseAnalytics) {
      try {
        firebaseAnalytics().logEvent('sign_up', { method });
      } catch (e) {}
    }
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
    if (firebaseAnalytics) {
      try {
        firebaseAnalytics().logEvent('view_item', {
          item_id: businessId,
          item_name: businessName?.slice(0, 50),
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
    track('filter_applied', {
      filter_type: filterType,
      filter_value: String(filterValue).slice(0, 50),
    });
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

// Force a native crash (Java/Objective-C) to verify and activate Firebase Crashlytics
const triggerNativeCrash = () => {
  console.log('💥 triggerNativeCrash called');
  if (firebaseCrashlytics) {
    console.log('💥 Calling firebaseCrashlytics().crash()...');
    firebaseCrashlytics().crash();
  } else {
    throw new Error('Firebase Crashlytics is not loaded or available.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const Monitoring = {
  init, // call once in App.js on mount
  setPostHogClient, // call from App.js after PostHogProvider is ready
  identifyUser,
  clearUser,
  captureError,
  captureMessage,
  breadcrumb,
  track,
  trackScreen,
  triggerNativeCrash, // Call this to test/activate Crashlytics
  Events,
};

export default Monitoring;
