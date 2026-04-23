const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessOwnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number with country code']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    default: 'business',
    enum: ['business']
  },
  address: {
    buildingNumber: String,
    street: String,
    city: String,
    county: String,
    state: String,
    postcode: String,
    country: { type: String, default: 'United Kingdom' },
    landmark: String,
    fullAddress: String
  },
  profileImage: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  businesses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }],
  pushToken: {
    type: String,
    default: null
  },
  pushTokenUpdatedAt: {
    type: Date,
    default: null
  },
  pushTokens: [{
    token: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown'
    },
    deviceId: {
      type: String,
      default: null
    },
    installationId: {
      type: String,
      default: null
    },
    appVersion: {
      type: String,
      default: null
    },
    lastRegisteredAt: {
      type: Date,
      default: Date.now
    },
    disabledAt: {
      type: Date,
      default: null
    },
    lastError: {
      type: String,
      default: null
    },
    lastErrorAt: {
      type: Date,
      default: null
    }
  }],
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['email', 'google', 'apple', 'facebook'],
    default: 'email'
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  settings: {
    twoFactorAuth: { type: Boolean, default: false },
    loginAlerts: { type: Boolean, default: true },
    dataSharing: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },

  // ─── Stripe Subscription ───────────────────────────────────────────────────
  subscription: {
    status: {
      type: String,
      enum: ['inactive', 'active', 'trialing', 'past_due', 'canceled', 'unpaid'],
      default: 'inactive'
    },
    plan: { type: String, default: null },
    stripeCustomerId: { type: String, default: null, select: false },
    stripeSubscriptionId: { type: String, default: null, select: false },
    stripePriceId: { type: String, default: null, select: false },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEnd: { type: Date, default: null }
  },

  // ─── Push Notification Settings (set by Admin) ────────────────────────────
  pushNotifications: {
    maxReach: { type: Number, default: 100, min: 1 },
    notifiedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalSent: { type: Number, default: 0 }
  },

  // ─── Free Trial: 25 updates before subscription required ──────────────────
  // Admin can adjust maxFreeUpdates per owner. Counter never resets on cancel.
  freeTrial: {
    updatesUsed: { type: Number, default: 0 },
    maxFreeUpdates: { type: Number, default: 25 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── isPro virtual ───────────────────────────────────────────────────────────
businessOwnerSchema.virtual('isPro').get(function () {
  const s = this.subscription;
  if (!s) return false;
  const activeStatuses = ['active', 'trialing'];
  if (!activeStatuses.includes(s.status)) return false;
  if (s.currentPeriodEnd && new Date(s.currentPeriodEnd) < new Date()) return false;
  return true;
});

// ── hasFreeTrial virtual ────────────────────────────────────────────────────
// True if owner still has free updates remaining AND is NOT already Pro.
// Once maxFreeUpdates is consumed, returns false. Counter never resets.
businessOwnerSchema.virtual('hasFreeTrial').get(function () {
  if (this.isPro) return false; // Pro users don't need trial
  const ft = this.freeTrial;
  if (!ft) return true; // Schema default: 0 used, 25 max
  return ft.updatesUsed < (ft.maxFreeUpdates || 25);
});

businessOwnerSchema.index({ 'pushTokens.token': 1 });

// Hash password before saving
businessOwnerSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
businessOwnerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to get public profile (includes subscription status but NOT Stripe IDs)
businessOwnerSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    profileImage: this.profileImage,
    status: this.status,
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    address: this.address,
    businesses: this.businesses,
    isPro: this.isPro,
    hasFreeTrial: this.hasFreeTrial,
    freeTrial: {
      updatesUsed: this.freeTrial?.updatesUsed || 0,
      maxFreeUpdates: this.freeTrial?.maxFreeUpdates || 25,
      remaining: Math.max(0, (this.freeTrial?.maxFreeUpdates || 25) - (this.freeTrial?.updatesUsed || 0)),
    },
    subscription: {
      status: this.subscription?.status || 'inactive',
      plan: this.subscription?.plan || null,
      currentPeriodEnd: this.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: this.subscription?.cancelAtPeriodEnd || false,
      trialEnd: this.subscription?.trialEnd || null,
    },
    createdAt: this.createdAt
  };
};

// Remove sensitive data when converting to JSON
businessOwnerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

// Index for faster queries
businessOwnerSchema.index({ email: 1 });
businessOwnerSchema.index({ phone: 1 });
businessOwnerSchema.index({ status: 1 });

module.exports = mongoose.model('BusinessOwner', businessOwnerSchema);
