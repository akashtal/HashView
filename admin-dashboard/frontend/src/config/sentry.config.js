// Try to import Sentry, but make it optional
let Sentry;
try {
  Sentry = require('@sentry/react-native');
} catch (error) {
  console.log('⚠️  Sentry not installed (optional) - Skipping error monitoring');
}

import Constants from 'expo-constants';

// Initialize Sentry
export const initializeSentry = () => {
  // Skip if Sentry is not available
  if (!Sentry) {
    console.log('⚠️  Sentry not available - Skipping initialization');
    return;
  }

  if (__DEV__) {
    console.log('Sentry not initialized in development mode');
    return;
  }

  // Only initialize in production
  if (Constants.expoConfig?.extra?.sentryDSN) {
    Sentry.init({
      dsn: Constants.expoConfig.extra.sentryDSN,
      enableInExpoDevelopment: false,
      debug: false, // Set to true for debugging
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: 0.1, // Adjust sampling rate for performance monitoring
      beforeSend(event, hint) {
        // Filter out non-critical errors
        const error = hint.originalException;
        
        if (error && error.message) {
          // Don't report network errors (they're usually user's connection issue)
          if (error.message.includes('Network') || 
              error.message.includes('timeout') ||
              error.message.includes('ECONNREFUSED')) {
            return null;
          }
          
          // Don't report validation errors
          if (error.message.includes('Validation') || 
              error.message.includes('validation')) {
            return null;
          }
        }
        
        return event;
      },
      integrations: [
        new Sentry.ReactNativeTracing({
          // Pass instrumentation to be used as `routingInstrumentation`
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
          tracingOrigins: ['localhost', /^\//],
        }),
      ],
    });

    console.log('✅ Sentry initialized for production');
  } else {
    console.log('⚠️  Sentry DSN not found in app config');
  }
};

// Export Sentry for manual error reporting (may be undefined)
export { Sentry };

// Helper function to capture errors manually
export const captureError = (error, context = {}) => {
  if (__DEV__) {
    console.error('Error captured:', error, context);
    return;
  }

  if (Sentry && Sentry.captureException) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

// Helper function to capture messages
export const captureMessage = (message, level = 'info') => {
  if (__DEV__) {
    console.log(`Message captured [${level}]:`, message);
    return;
  }

  if (Sentry && Sentry.captureMessage) {
    Sentry.captureMessage(message, level);
  }
};

// Helper function to add breadcrumb
export const addBreadcrumb = (breadcrumb) => {
  if (Sentry && Sentry.addBreadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }
};

// Helper to set user context
export const setUserContext = (user) => {
  if (!Sentry || !Sentry.setUser) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

