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
const { initializeSentry, Sentry } = require('./config/sentry');

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
const aiGateway = require('./ai-gateway/index'); // Phase 2: AI-powered search


// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { initializeRedis, closeRedis } = require('./config/redis');
const { checkNotificationReceipts } = require('./utils/notification');

// Import models
const User = require('./models/User.model');

// Initialize Express
const app = express();

// Initialize Sentry BEFORE other middleware
initializeSentry(app);

// Sentry request handler must be the first middleware on the app
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
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

// API Routes
const supportRoutes = require('./routes/support.routes');

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
app.use('/api/admin/rbac', rbacRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/external-reviews', externalReviewsRoutes);
app.use('/api/verification', require('./routes/verification.routes'));
app.use('/api/support', supportRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/menu-items', menuItemRoutes); // Phase 1: Menu & Services system
app.use('/ai', aiGateway);                 // Phase 2: AI-powered search gateway


// Socket.IO for real-time chat
const chatSocket = require('./sockets/chat.socket');
chatSocket(io);

// Initialize live business stats socket
const businessLiveController = require('./controllers/businessLive.controller');
businessLiveController.setSocketIO(io);

// Initialize automatic sync jobs (cron)
if (process.env.ENABLE_AUTO_SYNC !== 'false') {
  const { initializeSyncJobs } = require('./utils/syncJobs');
  initializeSyncJobs();
}

// Sentry error handler must be before other error handlers
if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
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
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    logger.info('✅ MongoDB Connected Successfully');
    console.log('✅ MongoDB Connected Successfully');

    // Initialize Redis (optional)
    await initializeRedis();

    // CRM-123 FIX: Drop problematic phone index causing Apple Sign-In errors
    try {
      await mongoose.connection.collection('users').dropIndex('phone_1');
      console.log('✅ FIXED: Dropped old users.phone_1 index');
    } catch (e) {
      // Ignore if index not found
      console.log('ℹ️  Index check: ' + e.message);
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
