const winston = require('winston');
const path = require('path');
const Sentry = require('../instrument'); // Import our instrument module containing Sentry and otelLogger

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Custom Sentry transport for Winston to forward handled logger.error calls
class SentryTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Only capture error-level logs and when Sentry is enabled
    if (info.level === 'error' && process.env.SENTRY_DSN) {
      let errorToSend;
      if (info.stack) {
        errorToSend = new Error(info.message);
        errorToSend.stack = info.stack;
      } else if (info instanceof Error) {
        errorToSend = info;
      } else {
        errorToSend = new Error(typeof info === 'string' ? info : (info.message || JSON.stringify(info)));
      }

      try {
        Sentry.captureException(errorToSend, {
          extra: {
            service: info.service,
            timestamp: info.timestamp,
            ...info
          }
        });
      } catch (err) {
        console.error('Failed to send error log to Sentry:', err.message);
      }
    }

    callback();
  }
}

// Custom PostHog transport for Winston to forward logs to PostHog OpenTelemetry collector
class PostHogWinstonTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const otelLogger = Sentry.otelLogger;
    if (otelLogger) {
      try {
        // Map winston levels to OpenTelemetry severity levels
        const severity = info.level === 'error' ? 'error' : (info.level === 'warn' ? 'warn' : 'info');

        otelLogger.emit({
          severityText: severity,
          body: typeof info === 'string' ? info : (info.message || JSON.stringify(info)),
          attributes: {
            service: info.service || 'hashview-api',
            timestamp: info.timestamp,
            // Forward metadata, stack trace, role, user etc.
            ...info
          }
        });
      } catch (err) {
        console.error('Failed to send log to PostHog:', err.message);
      }
    }

    callback();
  }
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'hashview-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    // Write all logs with level 'error' to error.log
    new winston.transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error' 
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join('logs', 'combined.log') 
    }),
    // Custom Sentry transport to capture all logger.error calls
    new SentryTransport({ level: 'error' }),
    // Custom PostHog OTel transport to forward all logs to PostHog
    new PostHogWinstonTransport()
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

module.exports = logger;
