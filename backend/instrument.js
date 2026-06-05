/**
 * Sentry Instrumentation File
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT: This file MUST be required at the very top of server.js —
 * before any other imports — so Sentry can instrument Node.js modules
 * (http, mongoose, redis) from the start.
 *
 * Per Sentry docs: https://docs.sentry.io/platforms/javascript/guides/node/
 */

require('dotenv').config();

// Initialize OpenTelemetry log exporting to PostHog if key is present
let otelLogger = null;
if (process.env.POSTHOG_API_KEY) {
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
    const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
    const { resourceFromAttributes } = require('@opentelemetry/resources');
    const { logs } = require('@opentelemetry/api-logs');

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        'service.name': 'hashview-backend',
        'environment': process.env.NODE_ENV || 'development',
      }),
      logRecordProcessor: new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${process.env.POSTHOG_HOST || 'https://us.i.posthog.com'}/i/v1/logs`,
          headers: {
            'Authorization': `Bearer ${process.env.POSTHOG_API_KEY}`
          }
        })
      )
    });

    sdk.start();
    otelLogger = logs.getLogger('hashview-backend');
    console.log('✅ PostHog OpenTelemetry logging initialized');
  } catch (err) {
    console.error('Failed to initialize OpenTelemetry for PostHog logs:', err.message);
  }
}

const Sentry = require('@sentry/node');
Sentry.otelLogger = otelLogger; // Attach to Sentry object for sharing with logger.js

// Only initialise in production (or when DSN is explicitly set)
if (process.env.SENTRY_DSN) {

  // Try to load profiling — optional, may not be available on all platforms
  let ProfilingIntegration;
  try {
    ProfilingIntegration = require('@sentry/profiling-node').ProfilingIntegration;
  } catch {
    // Profiling not available — that's fine
  }

  const integrations = [];
  if (ProfilingIntegration) {
    integrations.push(new ProfilingIntegration());
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Tag errors as production vs development in the Sentry dashboard
    environment: process.env.NODE_ENV || 'development',

    // Release tag — shows which deploy introduced a bug
    release: `hashview-backend@${process.env.APP_VERSION || '1.0.0'}`,

    // Collect user IP, headers etc. to know who was affected
    sendDefaultPii: true,

    integrations,

    // ─── Performance Tracing ─────────────────────────────────────────────────
    // 10% of production requests traced end-to-end (frontend click ↔ DB query)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // ─── Profiling (CPU flamegraphs per request) ──────────────────────────────
    profilesSampleRate: ProfilingIntegration
      ? (process.env.NODE_ENV === 'production' ? 0.1 : 1.0)
      : 0,

    // ─── Error Filtering ──────────────────────────────────────────────────────
    beforeSend(event, hint) {
      // Allow all errors to pass through to Sentry as requested by the user
      return event;
    },
  });

  // Intercept console.error to automatically forward logs/errors to Sentry
  const originalConsoleError = console.error;
  console.error = function (...args) {
    originalConsoleError.apply(console, args);

    try {
      // Find if any argument is an actual Error object
      const errorObj = args.find(arg => arg instanceof Error);
      if (errorObj) {
        Sentry.captureException(errorObj, {
          extra: { consoleArgs: args }
        });
      } else {
        // Reconstruct message from console arguments
        const message = args
          .map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
          .join(' ');
        
        // Skip common dev noise if needed, otherwise send
        Sentry.captureMessage(message, 'error');
      }
    } catch (e) {
      // Fallback to avoid infinite loops or crashes during Sentry logging
      originalConsoleError('Failed to capture console error in Sentry:', e.message);
    }
  };

  console.log(`✅ Sentry backend initialized [env: ${process.env.NODE_ENV || 'development'}]`);
} else {
  console.log('ℹ️  Sentry not configured — set SENTRY_DSN in .env to enable');
}

module.exports = Sentry;
