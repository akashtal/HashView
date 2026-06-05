/**
 * Sentry Backend Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises Sentry Node.js SDK for the Express API.
 *
 * Features enabled:
 *   • HTTP tracing (API latency per-route)
 *   • Express request/response tracing
 *   • Profiling (CPU flame graphs per request — optional)
 *   • Distributed tracing  →  links frontend Sentry traces to backend ones
 *   • beforeSend filter    →  suppresses noise (validation, 404)
 *   • User context         →  set by auth.middleware.js after JWT verification
 */

const Sentry = require('@sentry/node');

// Try to load profiling, but make it optional
let ProfilingIntegration;
try {
  ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
} catch {
  console.log('⚠️  Sentry profiling not available on this platform (optional)');
}

const initializeSentry = (app) => {
  const dsn = process.env.SENTRY_DSN;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!dsn) {
    console.log('ℹ️  Sentry not configured (set SENTRY_DSN environment variable)');
    return;
  }

  const integrations = [
    // Traces every HTTP request and response — latency visible in Sentry dashboard
    new Sentry.Integrations.Http({ tracing: true }),
    // Traces every Express route — shows which endpoint was slow or errored
    new Sentry.Integrations.Express({ app }),
    // Captures unhandled promise rejections automatically
    new Sentry.Integrations.OnUnhandledRejection({ mode: 'warn' }),
    // Captures uncaught exceptions
    new Sentry.Integrations.OnUncaughtException(),
    // Captures console.error() calls as breadcrumbs
    new Sentry.Integrations.Console(),
  ];

  if (ProfilingIntegration) {
    integrations.push(new ProfilingIntegration());
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `hashview-backend@${process.env.APP_VERSION || '1.0.0'}`,
    integrations,

    // ─── Performance Monitoring ───────────────────────────────────────────────
    // 10% of production requests are traced end-to-end (frontend ↔ backend)
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // ─── Profiling ────────────────────────────────────────────────────────────
    profilesSampleRate: ProfilingIntegration ? (isProduction ? 0.1 : 1.0) : 0,

    // ─── Error Filtering ──────────────────────────────────────────────────────
    beforeSend(event, hint) {
      // Allow all errors to pass through to Sentry as requested by the user
      return event;
    },
  });

  console.log(`✅ Sentry error monitoring initialized [env: ${process.env.NODE_ENV}]`);
};

module.exports = { initializeSentry, Sentry };
