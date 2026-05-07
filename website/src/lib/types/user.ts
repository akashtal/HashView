// ─── User Types ─────────────────────────────────────────────────────────────
// Mirrors: backend/models/User.model.js + BusinessOwner.model.js

export interface UserAddress {
  buildingNumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  landmark?: string;
  fullAddress?: string;
}

export interface UserLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface UserSettings {
  twoFactorAuth: boolean;
  loginAlerts: boolean;
  dataSharing: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
}

export interface SubscriptionInfo {
  status: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string | null;
}

export interface FreeTrialInfo {
  updatesUsed: number;
  maxFreeUpdates: number;
  remaining: number;
}

/** Customer / Admin user (from User collection) */
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'business' | 'admin' | 'guest';
  adminRole?: 'admin' | 'BUSINESS_MANAGER' | 'VIEWER' | null;
  permissions?: string[];
  profileImage?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  phoneVerified: boolean;
  address?: UserAddress;
  location?: UserLocation;
  businesses?: string[]; // ObjectId refs
  favoritePlaces?: string[]; // ObjectId refs
  authProvider?: 'email' | 'google' | 'apple' | 'facebook';
  settings?: UserSettings;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  isGuest?: boolean;
}

/** Business Owner user (from BusinessOwner collection) */
export interface BusinessOwner {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'business';
  profileImage?: string | null;
  avatar?: string | null;
  status: 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  phoneVerified: boolean;
  address?: UserAddress;
  businesses: string[]; // ObjectId refs
  authProvider?: 'email' | 'google' | 'apple' | 'facebook';
  settings?: UserSettings;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;

  // Subscription (from isPro virtual + subscription field)
  isPro: boolean;
  hasFreeTrial: boolean;
  freeTrial: FreeTrialInfo;
  subscription: SubscriptionInfo;

  // Notifications config
  pushNotifications?: {
    maxReach: number;
    totalSent: number;
  };
  isGuest?: boolean;
}

/** Union type — whatever /auth/me returns */
export type AuthUser = User | BusinessOwner;

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: 'customer' | 'business';
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'customer' | 'business';
  buildingNumber?: string;
  street?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  landmark?: string;
}
