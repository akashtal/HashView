# HashView — Complete Technical Audit & Architecture Improvement Plan

> **Audit Date:** 2026-02-15  
> **Scope:** Full-stack monorepo — Expo React Native frontend, Node.js/Express backend, Vite admin dashboard  
> **Auditor Perspective:** Senior Mobile Architect / CTO

---

## Table of Contents

1. [Project Overview & Structure](#1-project-overview--structure)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Security Audit](#3-security-audit)
4. [Performance Analysis](#4-performance-analysis)
5. [Database Schema Review](#5-database-schema-review)
6. [Subscription System Design](#6-subscription-system-design)
7. [Push Notification Architecture](#7-push-notification-architecture)
8. [UI/UX Improvement Strategy](#8-uiux-improvement-strategy)
9. [Deployment & Launch Strategy](#9-deployment--launch-strategy)
10. [Priority Action Items](#10-priority-action-items)

---

## 1. Project Overview & Structure

### Current Monorepo Layout

```
HashView/
├── frontend/              # Expo (SDK 53) + React Native 0.79
│   ├── src/
│   │   ├── components/    # 9 shared components
│   │   ├── config/        # api.config.js, colors.js, sentry.config.js
│   │   ├── constants/     # 1 file
│   │   ├── navigation/    # AppNavigator, AuthNavigator, MainNavigator
│   │   ├── screens/       # 48 files across 4 groups
│   │   │   ├── admin/     # 8 screens
│   │   │   ├── auth/      # 8 screens
│   │   │   ├── business/  # 15 screens
│   │   │   └── user/      # 17 screens
│   │   ├── services/      # api.service.js, notification.service.js, etc.
│   │   ├── store/         # Redux Toolkit, 5 slices
│   │   └── utils/         # 3 utility files
│   └── App.js             # Entry point
├── backend/               # Node.js + Express 4.18
│   ├── config/            # cloudinary, firebase, redis, sentry
│   ├── controllers/       # 19 controllers (some 46KB+)
│   ├── middleware/         # auth, cache, errorHandler, upload, validation
│   ├── models/            # 11 Mongoose models
│   ├── routes/            # 17 route files
│   ├── services/          # 1 file
│   ├── sockets/           # chat.socket.js
│   ├── utils/             # 12 files (jwt, notification, email, geocoding, etc.)
│   └── server.js          # Main entry (232 lines)
├── admin-dashboard/       # Vite + React (separate web app)
└── KEYSTORE_BACKUP_APPS/  # ⚠️ Keystores committed to repo
```

### Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Mobile Framework | Expo SDK | 53 |
| UI Framework | React Native | 0.79.6 |
| Styling | NativeWind (TailwindCSS) | 2.x |
| Navigation | React Navigation | 6.x (Stack + Bottom Tabs) |
| State Management | Redux Toolkit | 2.2.x |
| Backend Runtime | Node.js | ≥18 |
| Backend Framework | Express | 4.18.x |
| Database | MongoDB (Mongoose) | 7.6.x |
| Cache | Redis | 4.6.x |
| Auth | JWT (jsonwebtoken) + Firebase Auth | 9.x |
| Push Notifications | Expo Push + expo-server-sdk | 3.7 |
| Image Storage | Cloudinary | 1.41 |
| Error Tracking | Sentry | 7.99 |
| Real-time | Socket.IO | 4.6.x |
| Email | SendGrid + Nodemailer | — |
| Admin Dashboard | Vite + React | — |

---

## 2. Architecture Analysis

### 2.1 Frontend Architecture

#### ✅ What's Good
- **Role-based navigation** — Clean separation of customer/business/admin tab stacks in [MainNavigator.js](file:///d:/Office%20Work/HashView/frontend/src/navigation/MainNavigator.js)
- **Centralized API service** — Single [api.service.js](file:///d:/Office%20Work/HashView/frontend/src/services/api.service.js) with 106+ methods, Axios interceptors, and failover logic
- **Redux Toolkit** — Proper use of `createSlice` + `createAsyncThunk` for auth, business, review, coupon, notification
- **Deep linking** — Configured for `business/:id` route
- **Animated splash screen** — With safety fallback timer
- **Push notification service** — Structured with permission handling and backend registration

#### 🔴 Critical Issues

1. **Massive screen files** — `AddReviewScreen.js` (55KB), `UserHomeScreen.js` (43KB), `BusinessRegistrationScreen.js` (76KB), `BusinessDetailScreen.js` (38KB). These are unmanageable monoliths.

2. **No custom hooks** — Business logic is embedded directly in screens. No `useAuth()`, `useBusinesses()`, `usePagination()`, etc.

3. **Guest user hardcoded token** — In [authSlice.js](file:///d:/Office%20Work/HashView/frontend/src/store/slices/authSlice.js#L44-L66), guest login uses literal `'guest-token'` string that could bypass client-side auth checks.

4. **AsyncStorage for tokens** — Sensitive JWT tokens stored via `AsyncStorage` (unencrypted). The project has `expo-secure-store` installed but **not used** for token storage.

5. **Serializable check disabled** — `serializableCheck: false` in Redux store config masks potential state serialization issues.

6. **Only 9 shared components** — With 48 screens, there's massive code duplication (headers, loading states, forms, cards).

7. **Navigation ref created after use** — In [AppNavigator.js](file:///d:/Office%20Work/HashView/frontend/src/navigation/AppNavigator.js#L112-L124), `navigationRef` is used in the `useEffect` before it's defined (line 112 uses it, line 124 creates it).

8. **Async operations in reducer** — `loginSuccess` reducer in authSlice calls `AsyncStorage.setItem()` directly — this is a side effect inside a reducer, which violates Redux principles.

### 2.2 Backend Architecture

#### ✅ What's Good
- **Helmet + compression** — Security headers and gzip enabled
- **Structured routing** — Clean REST API with 17 route modules
- **Winston logging** — Structured logging with Morgan integration
- **Redis caching** — Infrastructure in place (config + middleware)
- **Sentry error tracking** — Properly integrated with request/tracing handlers
- **Graceful shutdown** — SIGTERM handler closes Redis + MongoDB connections
- **Geolocation verification** — Reviews require geofence proximity check
- **QR code system** — Business QR codes for review verification

#### 🔴 Critical Issues

1. **Duplicate User Models** — `User.model.js` AND `BusinessOwner.model.js` are nearly identical schemas (same fields: name, email, phone, passwordHash, firebaseUid, authProvider, settings, etc.). Auth middleware does **dual-collection lookups** on every request:
   ```javascript
   // Every authenticated request does this:
   req.user = await User.findById(decoded.id);
   if (!req.user) {
     req.user = await BusinessOwner.findById(decoded.id); // Fallback
   }
   ```
   This doubles database queries and creates data consistency nightmares.

2. **In-memory OTP storage** — [auth.controller.js](file:///d:/Office%20Work/HashView/backend/controllers/auth.controller.js) uses `const otpStore = new Map()` for OTPs. This is **not production-safe**: OTPs are lost on server restart and won't work with multiple server instances.

3. **In-memory suspicious activity log** — [review.controller.js](file:///d:/Office%20Work/HashView/backend/controllers/review.controller.js) uses `const suspiciousActivityLog = []` — same issue: lost on restart, not shared across instances.

4. **Hardcoded admin credentials** — In [server.js](file:///d:/Office%20Work/HashView/backend/server.js#L138-L169):
   ```javascript
   const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
   ```
   And the password is **logged to console**.

5. **CORS wildcard** — `origin: process.env.FRONTEND_URL || '*'` allows any origin if `FRONTEND_URL` isn't set.

6. **No rate limiting on most routes** — `express-rate-limit` is installed but **only the cache middleware utility exists**. Auth endpoints (login, register, OTP) have no rate limiting — vulnerable to brute force.

7. **No refresh token mechanism** — JWT expires in 7 days with no way to refresh. Users must re-login after expiry.

8. **Deprecated Mongoose options** — `useNewUrlParser` and `useUnifiedTopology` are no-ops in Mongoose 7+ but still passed.

9. **Massive controllers** — `admin.controller.js` (46KB), `business.controller.js` (46KB), `auth.controller.js` (33KB). These need to be split into service layers.

10. **404 handler after error handler** — In server.js, the 404 handler is placed AFTER `errorHandler` middleware, so it may never execute properly.

### 2.3 Recommended Production Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ iOS App  │  │ Android  │  │ Admin Dashboard  │  │
│  │ (Expo)   │  │ (Expo)   │  │ (Vite/React)     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────────────┘  │
└───────┼──────────────┼─────────────┼────────────────┘
        │              │             │
        ▼              ▼             ▼
┌─────────────────────────────────────────────────────┐
│              API GATEWAY / LOAD BALANCER             │
│          (Nginx / AWS ALB / Cloudflare)              │
│     • SSL termination • Rate limiting • CORS         │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Auth Service│ │ Business Svc │ │ Notification │
│  • JWT+Refresh│ │ • CRUD       │ │  Service     │
│  • OAuth     │ │ • Search     │ │ • Push       │
│  • Rate limit│ │ • Analytics  │ │ • Email      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────────┐
│                  DATA LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ MongoDB  │  │  Redis   │  │    Cloudinary     │  │
│  │ Atlas    │  │ (Cache + │  │    (CDN/Images)   │  │
│  │          │  │  OTPs +  │  │                   │  │
│  │          │  │  Sessions)│  │                   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Security Audit

### 🚨 CRITICAL Vulnerabilities

| # | Issue | Severity | Location |
|---|---|---|---|
| 1 | **Keystores committed to Git** | 🔴 CRITICAL | Root: `hashview-apps-release.keystore`, `debug.keystore` |
| 2 | **Firebase service account in repo** | 🔴 CRITICAL | `backend/config/firebase-service-account.json`, `frontend/*.json` |
| 3 | **`.env` files in repo** | 🔴 CRITICAL | `frontend/.env`, `backend/.env` |
| 4 | **In-memory OTP storage** | 🔴 CRITICAL | `auth.controller.js` — lost on restart, no TTL enforcement |
| 5 | **No rate limiting on auth** | 🔴 HIGH | Login/register/OTP endpoints unprotected |
| 6 | **Hardcoded admin password** | 🔴 HIGH | `server.js` line 141: `'Admin@123'` fallback |
| 7 | **JWT stored in AsyncStorage** | 🟡 HIGH | Unencrypted storage, vulnerable to extraction |
| 8 | **No refresh tokens** | 🟡 MEDIUM | 7-day JWT with no rotation |
| 9 | **CORS wildcard fallback** | 🟡 MEDIUM | `origin: '*'` if env not set |
| 10 | **Password logged to console** | 🟡 MEDIUM | Admin password printed during startup |
| 11 | **`optionalAuth` defined twice** | 🟡 LOW | Duplicate export in `auth.middleware.js` (lines 6 and 133) |
| 12 | **Debug logs in auth middleware** | 🟡 LOW | `console.log` exposes role/ID in authorize function |

### Recommended Fixes

```javascript
// 1. Move OTPs to Redis (immediate)
const storeOTP = async (key, otp, ttlSeconds = 300) => {
  await redisClient.setEx(`otp:${key}`, ttlSeconds, JSON.stringify({
    code: otp,
    attempts: 0,
    createdAt: Date.now()
  }));
};

// 2. Switch to SecureStore for tokens (immediate)
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);
const token = await SecureStore.getItemAsync('auth_token');

// 3. Add rate limiting to auth routes (immediate)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);

// 4. Implement refresh tokens
// Access token: 15 minutes
// Refresh token: 30 days, stored in DB, rotated on use
exports.generateTokenPair = (userId, userType) => ({
  accessToken: jwt.sign({ id: userId, userType }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ id: userId, purpose: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })
});
```

### Items to Remove from Git History

```bash
# Add to .gitignore immediately:
*.keystore
*.json  # Firebase service accounts
.env
credentials.json
```

> [!CAUTION]
> The release keystore and Firebase service account JSON files are **already in your Git history**. Even if you delete them now, they remain accessible via `git log`. You must rotate these credentials and consider using `git filter-branch` or BFG Repo-Cleaner to scrub them from history.

---

## 4. Performance Analysis

### 4.1 Frontend Performance Issues

| Issue | Impact | Fix |
|---|---|---|
| **76KB BusinessRegistrationScreen** | Slow bundle, slow navigation transitions | Split into step-by-step wizard components |
| **55KB AddReviewScreen** | Same — too much logic in one component | Extract form, camera, geolocation into hooks |
| **No lazy loading of screens** | Entire app loaded upfront | Use `React.lazy()` + `Suspense` for admin/business screens |
| **No FlatList optimization** | Janky scrolling on business lists | Add `getItemLayout`, `removeClippedSubviews`, `windowSize` |
| **No image caching** | Re-downloads images on every visit | `expo-image` (already installed) has caching, but ensure usage with `cachePolicy` |
| **All icons loaded at startup** | Font loading blocking splash | Load only needed icon families, use tree-shaking |
| **No pagination in Redux** | Full arrays in state for businesses/reviews | Implement cursor-based pagination with normalized state |
| **`serializableCheck: false`** | Hides bugs, potential memory leaks | Enable with proper serialization |

### 4.2 Backend Performance Issues

| Issue | Impact | Fix |
|---|---|---|
| **Dual-collection auth lookup** | 2× DB queries per authenticated request | Merge User + BusinessOwner into single `User` model |
| **No pagination defaults** | API returns unbounded results | Add `limit: 20` default, `maxLimit: 100` cap |
| **Cloudinary uploads not optimized** | Large images uploaded at full resolution | Resize on upload (`transformation: { width: 1200, quality: 80 }`) |
| **No query projection** | `findById()` returns all fields | Use `.select('field1 field2')` to reduce payload |
| **Missing compound indexes** | Slow queries on filtered searches | Add compound indexes for common query patterns |
| **Suspicious activities in memory array** | Memory leak, data loss | Move to MongoDB collection |
| **No connection pooling config** | Default Mongoose pool size | Configure `maxPoolSize: 10` for production |

### 4.3 Recommended Caching Strategy

```
┌────────────────────────────────────────────────────────┐
│                    CACHING LAYERS                       │
├────────────────────────────────────────────────────────┤
│ L1: Client-side (React Query/Redux)                    │
│     • Business list: staleTime 5 min                   │
│     • User profile: staleTime 30 min                   │
│     • Categories: staleTime 24 hours                   │
├────────────────────────────────────────────────────────┤
│ L2: Redis (Server-side)                                │
│     • Business search results: TTL 5 min               │
│     • Category list: TTL 1 hour                        │
│     • Dashboard stats: TTL 10 min                      │
│     • OTPs: TTL 5 min                                  │
│     • Rate limit counters: TTL 15 min                  │
├────────────────────────────────────────────────────────┤
│ L3: CDN (Cloudinary)                                   │
│     • Business images: Cloudinary transformations       │
│     • Profile images: Auto-format, auto-quality         │
│     • QR codes: Static, cache indefinitely              │
└────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema Review

### 5.1 Current Issues

#### 🔴 Issue #1: Duplicate User Collections

The `User` and `BusinessOwner` models share **90%+ identical fields**:

| Field | User | BusinessOwner |
|---|:---:|:---:|
| name, email, phone | ✅ | ✅ |
| passwordHash + bcrypt | ✅ | ✅ |
| role | ✅ | ✅ |
| address (same structure) | ✅ | ✅ |
| profileImage | ✅ | ✅ |
| status | ✅ | ✅ |
| emailVerified, phoneVerified | ✅ | ✅ |
| pushToken | ✅ | ✅ |
| firebaseUid, authProvider | ✅ | ✅ |
| businesses[] | ✅ | ✅ |
| settings (identical sub-schema) | ✅ | ✅ |
| location (GeoJSON) | ✅ | ❌ |
| favoritePlaces | ✅ | ❌ |

**Recommendation:** Merge into a single `User` model with a `role` discriminator.

#### 🔴 Issue #2: Review Model — No Unique Constraint for Same-Day Dedup

The comment says "one review per user per business per day," but the index `{ user: 1, business: 1, createdAt: 1 }` is NOT a unique index — it's just a regular compound index. The dedup must be enforced in application code, which is fragile.

#### 🟡 Issue #3: Business Model Bloat

The `Business` model (246 lines) contains:
- 5 document verification sub-documents (ownerIdProof, addressProof, selfie, businessLicense, foodSafetyCertificate)
- Embedded external reviews arrays (TripAdvisor, Google)
- Admin verification sub-document

This should be normalized into separate collections.

#### 🟡 Issue #4: Coupon Model — Redundant Status Fields

Both `status` and `isActive` track active state, creating ambiguity.

### 5.2 Recommended Schema (Optimized)

```javascript
// ═══════════════════════════════════════════════
// UNIFIED USER MODEL (replaces User + BusinessOwner)
// ═══════════════════════════════════════════════
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, sparse: true, unique: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['customer', 'business', 'admin'], default: 'customer' },
  
  // Subscription (NEW)
  subscription: {
    plan: { type: String, enum: ['free', 'notify', 'pro'], default: 'free' },
    status: { type: String, enum: ['active', 'cancelled', 'expired', 'past_due'], default: 'active' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  
  // OAuth
  authProvider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },
  firebaseUid: { type: String, sparse: true, unique: true },
  
  // Profile
  profileImage: String,
  address: addressSubSchema,
  location: geoPointSchema,
  pushTokens: [{ token: String, platform: String, updatedAt: Date }], // Multiple devices
  
  // Status
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  emailVerified: { type: Boolean, default: false },
  lastLogin: Date,
  
  // Relationships
  businesses: [{ type: ObjectId, ref: 'Business' }],
  favoritePlaces: [{ type: ObjectId, ref: 'Business' }],
  settings: settingsSubSchema
}, { timestamps: true });

// ═══════════════════════════════════════════════
// SUBSCRIPTION MODEL (NEW)
// ═══════════════════════════════════════════════
const subscriptionSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['notify', 'pro'], required: true },
  status: { type: String, enum: ['active', 'past_due', 'cancelled', 'expired'] },
  
  // Stripe
  stripeSubscriptionId: { type: String, unique: true },
  stripeCustomerId: String,
  stripePriceId: String,
  
  // Billing
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
  
  // Feature access
  features: {
    customPushNotifications: { type: Boolean, default: false },
    businessClaiming: { type: Boolean, default: false },
    analyticsAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  },
  
  // Audit
  history: [{
    action: { type: String, enum: ['created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'expired'] },
    fromPlan: String,
    toPlan: String,
    timestamp: Date,
    metadata: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

// ═══════════════════════════════════════════════
// BUSINESS MODEL (Normalized)
// ═══════════════════════════════════════════════
const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: ObjectId, ref: 'User' },
  category: { type: ObjectId, ref: 'Category' }, // Reference instead of string
  description: String,
  
  // Contact
  email: String,
  phone: String,
  website: String,
  
  // Location
  address: addressSubSchema,
  location: { type: geoPointSchema, required: true },
  radius: { type: Number, default: 50 },
  
  // Media
  logo: mediaSchema,
  coverImage: mediaSchema,
  images: [mediaSchema],
  
  // Aggregated ratings (updated via post-save hooks on Review)
  rating: { average: Number, count: Number },
  
  // Status
  status: { type: String, enum: ['pending', 'active', 'suspended', 'rejected'] },
  kycStatus: { type: String, enum: ['pending', 'in_review', 'approved', 'rejected'] },
  
  // Claiming
  claimed: { type: Boolean, default: false },
  claimedBy: { type: ObjectId, ref: 'User' },
  claimedAt: Date,
  
  openingHours: openingHoursSchema,
  qrCode: String
}, { timestamps: true });

// ═══════════════════════════════════════════════
// VERIFICATION DOCUMENTS (Separated from Business)
// ═══════════════════════════════════════════════
const verificationDocSchema = new mongoose.Schema({
  business: { type: ObjectId, ref: 'Business', required: true },
  documentType: { type: String, enum: ['owner_id', 'address_proof', 'selfie', 'license', 'food_safety'] },
  url: String,
  publicId: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'] },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String
}, { timestamps: true });
```

### 5.3 Recommended Indexes

```javascript
// User
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 }, { sparse: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ location: '2dsphere' });

// Business
businessSchema.index({ location: '2dsphere' });
businessSchema.index({ category: 1, status: 1 });
businessSchema.index({ owner: 1 });
businessSchema.index({ name: 'text', description: 'text' }); // Full-text search
businessSchema.index({ status: 1, 'rating.average': -1 }); // Popular businesses

// Review — UNIQUE constraint for dedup
reviewSchema.index({ user: 1, business: 1 }, { unique: true }); // One review per user per business
reviewSchema.index({ business: 1, createdAt: -1 }); // Recent reviews

// Subscription
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 }); // Expiry checks
```

---

## 6. Subscription System Design

### 6.1 Plan Structure

| Feature | Free | Notify Plan ($29/mo) | Pro Plan ($79/mo) |
|---|:---:|:---:|:---:|
| Browse/search businesses | ✅ | ✅ | ✅ |
| Leave reviews | ✅ | ✅ | ✅ |
| Earn rewards | ✅ | ✅ | ✅ |
| View basic analytics | — | ✅ | ✅ |
| **Custom push notifications** | — | ✅ (50/mo) | ✅ (unlimited) |
| **Claim business profile** | — | — | ✅ |
| Edit business info | — | — | ✅ |
| Priority support | — | — | ✅ |
| Coupon management | — | ✅ | ✅ |
| Advanced analytics | — | — | ✅ |

### 6.2 Payment Integration (Stripe)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Mobile App │────▶│  Backend API │────▶│    Stripe    │
│              │     │              │     │              │
│ 1. Select    │     │ 2. Create    │     │ 3. Process   │
│    plan      │     │    checkout  │     │    payment   │
│              │     │    session   │     │              │
│ 4. Open      │◀────│              │◀────│ 5. Webhook   │
│    WebView   │     │ 6. Activate  │     │    confirms  │
│              │     │    features  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

#### Backend Routes for Subscriptions

```javascript
// routes/subscription.routes.js
router.post('/create-checkout', protect, authorize('business'), createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.get('/status', protect, getSubscriptionStatus);
router.post('/cancel', protect, cancelSubscription);
router.post('/upgrade', protect, upgradeSubscription);
router.post('/portal', protect, createBillingPortal);
```

#### Feature Gating Middleware

```javascript
// middleware/subscription.middleware.js
const requireSubscription = (requiredPlan) => async (req, res, next) => {
  const user = req.user;
  
  if (!user.subscription || user.subscription.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Active subscription required',
      requiredPlan
    });
  }
  
  const planHierarchy = { free: 0, notify: 1, pro: 2 };
  if (planHierarchy[user.subscription.plan] < planHierarchy[requiredPlan]) {
    return res.status(403).json({
      success: false,
      message: `This feature requires the ${requiredPlan} plan or higher`,
      currentPlan: user.subscription.plan,
      requiredPlan
    });
  }
  
  next();
};

// Usage:
router.post('/send-notification', protect, requireSubscription('notify'), sendCustomNotification);
router.post('/claim-business', protect, requireSubscription('pro'), claimBusiness);
```

#### Stripe Webhook Handler

```javascript
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await activateSubscription(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await renewSubscription(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await deactivateSubscription(event.data.object);
      break;
  }
  
  res.json({ received: true });
};
```

---

## 7. Push Notification Architecture

### 7.1 Current System Assessment

**Current:** Expo Push Notifications via `expo-server-sdk`, individual `sendPushNotification()` per user, no topic system, no rate limiting, single push token per user.

**Issues:**
- No multi-device support (only one `pushToken` field per user)
- `sendBulkNotifications` uses `Promise.allSettled` — can overwhelm Expo API
- No deduplication or throttling
- No topic/channel system for business followers

### 7.2 Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 NOTIFICATION SYSTEM                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Business Owner (with Notify plan)                       │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────────┐                                        │
│  │ Create Notif │── Rate Check ──▶ Redis Counter         │
│  │ (API Call)   │      │           (50/mo limit)         │
│  └──────┬───────┘      │                                 │
│         │         ┌────▼────┐                            │
│         ▼         │ REJECT  │ (limit exceeded)           │
│  ┌──────────────┐ └─────────┘                            │
│  │ Queue (Redis │                                        │
│  │  Bull/BullMQ)│                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐     ┌──────────────┐                   │
│  │ Notification │────▶│ Expo Push    │                   │
│  │ Worker       │     │ API          │                   │
│  │ (chunked)    │     │ (batch of    │                   │
│  │              │     │  100 tokens) │                   │
│  └──────────────┘     └──────────────┘                   │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │ Receipt      │── Check delivery status                │
│  │ Checker      │── Handle DeviceNotRegistered           │
│  │ (Cron 15min) │── Clean invalid tokens                 │
│  └──────────────┘                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Topic System for Business Followers

```javascript
// Model: BusinessFollower (NEW)
const businessFollowerSchema = new mongoose.Schema({
  business: { type: ObjectId, ref: 'Business', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  notificationsEnabled: { type: Boolean, default: true }
}, { timestamps: true });
businessFollowerSchema.index({ business: 1, user: 1 }, { unique: true });
businessFollowerSchema.index({ business: 1, notificationsEnabled: 1 });

// Send notification to all followers of a business
const sendBusinessNotification = async (businessId, title, message, senderId) => {
  // Rate limit check
  const monthKey = `notify:${senderId}:${new Date().toISOString().slice(0, 7)}`;
  const count = await redis.incr(monthKey);
  if (count === 1) await redis.expire(monthKey, 30 * 24 * 60 * 60);
  
  const user = await User.findById(senderId);
  const limit = user.subscription.plan === 'pro' ? Infinity : 50;
  
  if (count > limit) {
    throw new Error(`Monthly notification limit (${limit}) exceeded`);
  }
  
  // Get all followers with notifications enabled
  const followers = await BusinessFollower.find({
    business: businessId,
    notificationsEnabled: true
  }).populate('user', 'pushTokens');
  
  // Collect all valid push tokens
  const tokens = followers
    .flatMap(f => f.user.pushTokens || [])
    .map(t => t.token)
    .filter(t => Expo.isExpoPushToken(t));
  
  // Chunk and send
  const messages = tokens.map(token => ({
    to: token, sound: 'default', title, body: message,
    data: { type: 'business_promotion', businessId },
    channelId: 'promotions'
  }));
  
  // Use BullMQ for async processing
  await notificationQueue.add('send-bulk', { messages, businessId, title, message });
};
```

---

## 8. UI/UX Improvement Strategy

### 8.1 Current State Assessment

| Aspect | Status | Notes |
|---|---|---|
| Design System | 🟡 Partial | `colors.js` exists but no typography, spacing, or component tokens |
| Component Library | 🔴 Minimal | 9 shared components for 48 screens |
| Styling Approach | 🟡 Mixed | NativeWind (TailwindCSS) installed but coexists with inline styles |
| Loading States | 🟡 Unknown | Likely inconsistent across screens |
| Empty States | 🟡 Unknown | Likely missing or basic |
| Error Handling UI | 🟡 Toast-based | `react-native-toast-message` used globally |

### 8.2 Recommended Design System

#### Color Palette (Current is Good)

The current palette from [colors.js](file:///d:/Office%20Work/HashView/frontend/src/config/colors.js) is solid. Suggest adding:

```javascript
// Add semantic dark mode support
export const COLORS = {
  // Keep existing palette...
  
  // Add dark mode variants
  dark: {
    background: '#0A0A1A',
    surface: '#1A1A2E',
    surfaceElevated: '#252540',
    text: '#FAFAFA',
    textSecondary: '#A0A0B8',
    border: '#2A2A44',
  },
  
  // Add gradients
  gradients: {
    primary: ['#210059', '#3D1B79', '#6B21A8'],
    secondary: ['#FC8603', '#FD9F3D'],
    card: ['#1A1A2E', '#252540'],
  }
};
```

#### Typography System

```javascript
// config/typography.js
export const FONTS = {
  heading: {
    fontFamily: 'Inter-Bold',     // or 'Outfit-Bold'
    h1: { fontSize: 32, lineHeight: 40, fontWeight: '800' },
    h2: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
    h3: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
    h4: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  },
  body: {
    fontFamily: 'Inter-Regular',
    large: { fontSize: 16, lineHeight: 24 },
    medium: { fontSize: 14, lineHeight: 22 },
    small: { fontSize: 12, lineHeight: 18 },
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 12, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase'
  }
};
```

#### Spacing System

```javascript
// config/spacing.js
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### 8.3 Critical Component Library (Minimum)

Build these shared components to eliminate 80%+ of code duplication:

```
components/
├── ui/
│   ├── Button.js            # Primary, Secondary, Ghost, Link variants
│   ├── Card.js              # Business card, review card, coupon card
│   ├── Input.js             # Text, Password, Phone, Search
│   ├── Avatar.js            # User/Business avatar with fallback
│   ├── Badge.js             # Status badges (active, pending, etc.)
│   ├── BottomSheet.js       # Reusable bottom sheet
│   ├── Skeleton.js          # Loading skeleton shimmer
│   ├── EmptyState.js        # Consistent empty state views
│   └── Divider.js           # Horizontal/vertical divider
├── layout/
│   ├── ScreenWrapper.js     # Safe area + scroll + refresh
│   ├── Header.js            # Consistent header with back/actions
│   └── Section.js           # Section with title + "See All"
├── business/
│   ├── BusinessCard.js      # Reusable business card
│   ├── RatingDisplay.js     # Star rating component
│   └── CategoryChip.js      # Category filter chip
├── review/
│   ├── ReviewCard.js        # Reusable review display
│   └── StarInput.js         # Star rating input
└── feedback/
    ├── LoadingOverlay.js    # Full-screen loading
    └── ErrorBoundary.js     # Error boundary wrapper
```

### 8.4 Screen Refactoring Strategy

**Before (76KB monolith):**
```
BusinessRegistrationScreen.js — 76KB, 2000+ lines
```

**After (step-by-step wizard):**
```
BusinessRegistration/
├── BusinessRegistrationScreen.js    # Main wizard controller (~200 lines)
├── steps/
│   ├── BasicInfoStep.js             # Name, category, description
│   ├── LocationStep.js              # Address, map picker
│   ├── ContactStep.js               # Phone, email, website
│   ├── MediaStep.js                 # Logo, cover image, photos
│   ├── HoursStep.js                 # Opening hours
│   └── ReviewStep.js                # Final review before submit
├── hooks/
│   ├── useBusinessForm.js           # Form state + validation
│   └── useImagePicker.js            # Image selection logic
└── components/
    ├── StepIndicator.js             # Progress indicator
    └── FormField.js                 # Styled form field
```

---

## 9. Deployment & Launch Strategy

### 9.1 Backend Deployment

| Service | Recommended | Reasoning |
|---|---|---|
| **API Hosting** | AWS EC2 / Railway | You already have Railway + EC2 config. Railway for simplicity, EC2 for control |
| **Database** | MongoDB Atlas (M10+) | Managed, auto-scaling, backups, monitoring |
| **Redis** | Redis Cloud / Upstash | Managed Redis with persistence |
| **Image CDN** | Cloudinary (current) | Already integrated, good enough |
| **DNS/SSL** | Cloudflare | Free SSL, DDoS protection, caching |
| **Monitoring** | Sentry (current) + Datadog | Already have Sentry, add Datadog for APM |

### 9.2 Environment Variable Management

```bash
# Required production env vars
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=<random-64-char>
JWT_REFRESH_SECRET=<different-random-64-char>
SENTRY_DSN=https://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SENDGRID_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
FIREBASE_PROJECT_ID=...
ADMIN_EMAIL=<secure-email>
ADMIN_PASSWORD=<secure-generated-password>  # Change immediately after first login
FRONTEND_URL=https://your-domain.com  # NEVER leave as '*'
```

### 9.3 EAS Build Configuration

Current [eas.json](file:///d:/Office%20Work/HashView/frontend/eas.json) needs these updates:

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://localhost:5001/api"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://staging-api.hashview.com/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.hashview.com/api"
      },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "...",
        "ascAppId": "...",
        "appleTeamId": "..."
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

### 9.4 App Store / Play Store Checklist

| Item | Status | Action Needed |
|---|---|---|
| App icons (all sizes) | ❓ | Generate for iOS (1024×1024) and Android (512×512) |
| Splash screen | ✅ | AnimatedSplashScreen exists |
| Privacy policy URL | ❓ | Required for both stores |
| Terms of service URL | ❓ | Required for both stores |
| App description + screenshots | ❓ | Prepare store listing |
| In-app purchases config | ❌ | Needed for Stripe on iOS (or use server-side billing) |
| Push notification entitlement | ❓ | iOS: enable in Apple Developer Portal |
| Location permission justification | ✅ | Needed for geofence reviews |
| Keystore security | 🔴 | Remove from Git, store in EAS Credentials |

> [!IMPORTANT]
> **Apple App Store Guideline 3.1.1:** If using Stripe for subscriptions that unlock features **within the app**, Apple may require you to use In-App Purchases instead (30% cut). Consider using **server-side only features** (e.g., "business management dashboard on web") for Stripe-billed subscriptions, or use `react-native-purchases` (RevenueCat) for IAP compliance.

---

## 10. Priority Action Items

### 🔴 Immediate (Before Launch)

1. **Remove all secrets from Git** — keystores, `.env`, Firebase JSON, `credentials.json`
2. **Migrate OTP storage to Redis** — In-memory Maps are not production-safe
3. **Add rate limiting** to auth endpoints (login, register, OTP)
4. **Move JWT to SecureStore** — Replace `AsyncStorage` with `expo-secure-store`
5. **Merge User + BusinessOwner models** — Eliminate dual-collection lookups
6. **Remove hardcoded admin password** — Use only env vars, never log passwords
7. **Set explicit CORS origin** — Remove `'*'` fallback

### 🟡 Short-Term (First 2 Weeks)

8. **Implement refresh token system** — 15-min access + 30-day refresh
9. **Add pagination** to all list endpoints (businesses, reviews, notifications, coupons)
10. **Split monolith screens** — Break 40KB+ screens into composable components
11. **Build component library** — 15 essential shared components
12. **Move suspicious activity log** to MongoDB collection
13. **Add request validation** — Use Joi middleware on all POST/PUT routes consistently
14. **Fix duplicate `optionalAuth` export** in auth middleware

### 🟢 Medium-Term (Month 1-2)

15. **Implement subscription system** — Stripe integration + feature gating
16. **Build push notification queue** — BullMQ + Redis for reliable delivery
17. **Add topic-based notifications** — Business follower system
18. **Create design system** — Typography, spacing, component tokens
19. **Implement FlatList optimizations** — `getItemLayout`, `windowSize`, etc.
20. **Add proper image caching** — Leverage `expo-image` cachePolicy
21. **Set up CI/CD** — GitHub Actions for lint, test, EAS build
22. **Add end-to-end encryption** for chat messages

### 🔵 Long-Term (Month 2-4)

23. **Normalize Business model** — Separate verification documents
24. **Add full-text search** — MongoDB text index or Algolia/Meilisearch
25. **Implement offline mode** — Queue review submissions when offline
26. **Add analytics dashboard** — Business owners see review trends
27. **Set up CDN** — Cloudflare for API responses + static assets
28. **Load testing** — Artillery/k6 for production traffic simulation
29. **Accessibility audit** — Screen reader support, contrast ratios
30. **Internationalization (i18n)** — Multi-language support

---

> **Bottom Line:** The project has a solid feature set and good foundational architecture. The critical path to production readiness is (1) security hardening, (2) merging the duplicate user models, (3) moving in-memory state to Redis, and (4) breaking apart the monolith screen files. The subscription and notification systems can be added incrementally once the foundation is production-safe.
