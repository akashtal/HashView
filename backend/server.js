// IMPORTANT: instrument.js must be the very first require — before dotenv, express, mongoose.
// This lets Sentry patch Node's built-in http, mongoose, and redis modules from startup.
const Sentry = require('./instrument');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
const cron = require('node-cron');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const businessRoutes = require('./routes/business.routes');
const businessUpdateRoutes = require('./routes/businessUpdate.routes');
const reviewRoutes = require('./routes/review.routes');
const couponRoutes = require('./routes/coupon.routes');
const businessCouponRoutes = require('./routes/businessCoupon.routes');
const categoryRoutes = require('./routes/category.routes');
const adminRoutes = require('./routes/admin.routes');
const rbacRoutes = require('./routes/rbac.routes');
const notificationRoutes = require('./routes/notification.routes');
const oauthRoutes = require('./routes/oauth.routes');
const chatRoutes = require('./routes/chat.routes');
const uploadRoutes = require('./routes/upload.routes');
const externalReviewsRoutes = require('./routes/externalReviews.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { handleWebhook } = require('./controllers/subscription.controller');
const menuItemRoutes = require('./routes/menuItem.routes');
const orderRoutes = require('./routes/order.routes'); // Phase 1: Ordering system
const billingRulesRoutes = require('./routes/billingRules.routes'); // Phase 6: Tax & Charge Rules
const billingRoutes = require('./routes/billing.routes'); // Phase 1: Billing engine
const aiGateway = require('./ai-gateway/index'); // Phase 2: AI-powered search
const billing = require('./routes/billing.routes');
const healthRoutes = require('./routes/health.routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { initializeRedis, closeRedis } = require('./config/redis');
const { checkNotificationReceipts } = require('./utils/notification');
const { metricsMiddleware, renderMetrics } = require('./middleware/metrics.middleware');

// Import models
const User = require('./models/User.model');

// Initialize Express
const app = express();

// Sentry Express request/tracing handlers — must be first middleware
// Works in all environments where SENTRY_DSN is set (not just production)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: !!process.env.FRONTEND_URL
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow images from Cloudinary
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: !!process.env.FRONTEND_URL // Only allow credentials if specific origin is set
}));
// ─── Stripe Webhook — MUST be before express.json() ───────────────────────
// Stripe signature verification requires the raw request body (a Buffer).
// If express.json() parses this first, the signature check will always fail.
app.post(
  '/api/subscription/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// Android App Links verification
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.hashview.apps",
      "sha256_cert_fingerprints": ["FC:B5:77:A4:78:90:DB:A8:53:93:31:53:AE:15:30:44:83:03:A6:1C:31:25:62:A7:D6:80:00:C2:27:C8:D4:94"]
    }
  }]);
});

// ── Metrics collection middleware (must be early, before routes) ───────────────────
// Tracks request count, latency, errors, and active users for Grafana Cloud.
app.use(metricsMiddleware);

// ── Prometheus /metrics endpoint (scraped by Grafana Cloud) ───────────────────
// Protected by a bearer token to prevent public access.
// Set GRAFANA_METRICS_TOKEN in .env — the same value must be configured
// as a header in your Grafana Cloud scrape job.
app.get('/metrics', (req, res) => {
  const token = process.env.GRAFANA_METRICS_TOKEN;
  if (token) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader !== `Bearer ${token}`) {
      return res.status(401).send('Unauthorized');
    }
  }
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(renderMetrics());
});

// Smart QR redirect route - serves landing page with business ID
app.get('/business/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'business.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HashView API is running',
    timestamp: new Date().toISOString()
  });
});

// Sentry debug route to trigger an intentional 500 error
app.get('/debug-sentry', (req, res) => {
  throw new Error('Sentry Backend Test Error - ' + new Date().toISOString());
});

// API Versioning
const apiVersioning = require('./middleware/apiVersioning');
app.use('/api', apiVersioning);

// API Routes
const supportRoutes = require('./routes/support.routes');
const customizationRoutes = require('./routes/customization.routes');

app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api', businessUpdateRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/business-coupons', businessCouponRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billing);
app.use('/api/admin/rbac', rbacRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/external-reviews', externalReviewsRoutes);
app.use('/api/verification', require('./routes/verification.routes'));
app.use('/api/support', supportRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/menu-items', menuItemRoutes); // Phase 1: Menu & Services system
app.use('/api/customizations', customizationRoutes); // Phase 2: Menu customizations
app.use('/api/orders', orderRoutes); // Phase 5: Order routes
app.use('/api/billing-rules', billingRulesRoutes); // Phase 6: Tax/Charge rules
app.use('/api/business/:businessId/billing', billingRoutes); // Phase 4: Billing preview routes
app.use('/api/health', healthRoutes);
app.use('/api/referral', require('./routes/referral.routes')); // Referral / Invite system
app.use('/ai', aiGateway);                 // Phase 2: AI-powered search gateway


// Socket.IO for real-time chat
const chatSocket = require('./sockets/chat.socket');
chatSocket(io);

// Initialize order tracking socket
const orderSocket = require('./sockets/order.socket');
orderSocket.init(io);

// Initialize live business stats socket
const businessLiveController = require('./controllers/businessLive.controller');
businessLiveController.setSocketIO(io);

// Initialize automatic sync jobs (cron)
if (process.env.ENABLE_AUTO_SYNC !== 'false') {
  const { initializeSyncJobs } = require('./utils/syncJobs');
  const { initArchivalJob } = require('./utils/orderArchival');
  initializeSyncJobs();
  initArchivalJob();
}

// Start BullMQ workers
require('./workers/notificationWorker');

// Sentry error handler — catches all unhandled errors and sends to dashboard
// Must be AFTER all routes, BEFORE the custom error handler
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Function to create default admin account
const createDefaultAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hashview.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        phone: '+449989675789',
        passwordHash: adminPassword,
        role: 'admin',
        status: 'active',
        emailVerified: true,
        phoneVerified: true
      });
      logger.info(`✅ Default admin account created: ${adminEmail}`);
      console.log(`✅ Default admin account created: ${adminEmail}`);
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      logger.info('ℹ️  Admin account already exists');
      console.log('ℹ️  Admin account already exists');
    }
  } catch (error) {
    logger.error('❌ Error creating default admin:', error);
    console.error('❌ Error creating default admin:', error);
  }
};

// Force Node.js to use Google Public DNS for SRV lookups (fixes corporate/ISP DNS issues)
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// MongoDB Connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(async () => {
      logger.info('✅ MongoDB Connected Successfully');
      console.log('✅ MongoDB Connected Successfully');

      // Initialize Redis and configure Socket.IO Redis Adapter
      await initializeRedis();
      const { redisClient } = require('./config/redis');
      if (redisClient && redisClient.isOpen) {
        try {
          const { createAdapter } = require('@socket.io/redis-adapter');
          const pubClient = redisClient.duplicate();
          const subClient = redisClient.duplicate();
          await Promise.all([pubClient.connect(), subClient.connect()]);
          io.adapter(createAdapter(pubClient, subClient));
          logger.info('✅ Socket.IO Redis adapter configured for horizontal scaling');

          // Warm up cache for top restaurants
          const { warmMenuCache } = require('./utils/cacheWarming');
          warmMenuCache(); // Fire and forget
        } catch (err) {
          logger.error('❌ Error configuring Socket.IO Redis adapter:', err);
        }
      }

      // CRM-123 FIX: Ensure users.phone_1 index is sparse so multiple users can register without a phone.
      // This check replaces the old "always drop" approach which was destroying the correct sparse index on every boot.
      try {
        const userIndexes = await mongoose.connection.collection('users').indexes();
        const phoneIdx = userIndexes.find(i => i.name === 'phone_1');
        if (phoneIdx && !phoneIdx.sparse) {
          // Old non-sparse index found — drop and recreate as sparse
          await mongoose.connection.collection('users').dropIndex('phone_1');
          await mongoose.connection.collection('users').createIndex(
            { phone: 1 },
            { unique: true, sparse: true, name: 'phone_1' }
          );
          console.log('✅ CRM-123: Rebuilt users.phone_1 as sparse unique index.');
        } else if (!phoneIdx) {
          // Index missing entirely — create it
          await mongoose.connection.collection('users').createIndex(
            { phone: 1 },
            { unique: true, sparse: true, name: 'phone_1' }
          );
          console.log('✅ CRM-123: Created users.phone_1 sparse unique index.');
        } else {
          console.log('✅ CRM-123: users.phone_1 is already sparse — no action needed.');
        }
      } catch (e) {
        console.log('ℹ️  CRM-123 index check: ' + e.message);
      }

      // Create default admin account
      await createDefaultAdmin();

      // RBAC MIGRATION: Clear any stale 'SUPER_ADMIN' adminRole values left from
      // a previous development session. Existing admin accounts with adminRole=null
      // automatically get full access via the ROLE_PERMISSIONS['admin'] mapping.
      try {
        const result = await User.updateMany(
          { role: 'admin', adminRole: 'SUPER_ADMIN' },
          { $set: { adminRole: null } }
        );
        if (result.modifiedCount > 0) {
          console.log(`✅ RBAC MIGRATION: Cleared ${result.modifiedCount} stale SUPER_ADMIN adminRole(s) → null`);
        }
      } catch (e) {
        console.log('ℹ️  RBAC migration check: ' + e.message);
      }
    })
    .catch((err) => {
      logger.error('❌ MongoDB Connection Error:', err);
      console.error('❌ MongoDB Connection Error:', err);
      process.exit(1);
    });

  // Start Server
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    console.log(`📡 Server accessible at http://localhost:${PORT} and https://api.hashview.co.uk`);
  });

  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkNotificationReceipts();
    } catch (error) {
      logger.error('[Push] Scheduled receipt check failed:', error.message);
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close Redis
    await closeRedis();

    // Close MongoDB (Mongoose 7+ doesn't accept callback)
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }

    process.exit(0);
  });
});

module.exports = { app, io };
