// ─── Business Types ──────────────────────────────────────────────────────────
// Mirrors: backend/models/Business.model.js + BusinessUpdate.model.js + Category.model.js

export interface BusinessAddress {
  buildingNumber?: string;
  street?: string;
  area?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
  zipCode?: string;
  landmark?: string;
  fullAddress?: string;
}

export interface BusinessLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface BusinessImage {
  url: string;
  publicId?: string;
}

export interface DocumentRecord {
  url?: string;
  publicId?: string;
  verified?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface BusinessDocuments {
  ownerIdProof?: DocumentRecord;
  addressProof?: DocumentRecord;
  selfie?: DocumentRecord;
  businessLicense?: DocumentRecord;
  foodSafetyCertificate?: DocumentRecord;
}

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface OpeningHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface ExternalReviewItem {
  reviewId?: string;
  author?: string;
  authorPhoto?: string;
  rating?: number;
  text?: string;
  title?: string;
  date?: string;
  url?: string;
  helpful?: number;
  relativeTime?: string;
}

export interface ClaimRequest {
  status: 'none' | 'incomplete' | 'pending' | 'approved' | 'rejected';
  requestedBy?: string;
  requestedAt?: string;
  businessEmail?: string;
  role?: 'owner' | 'manager' | 'other';
  agreedToTerms?: boolean;
  verificationMethod?: 'document' | 'phone';
  phoneVerified?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Business {
  _id: string;
  id?: string;
  name: string;
  owner?: string; // ObjectId ref
  ownerName?: string;
  email?: string;
  phone?: string;
  category: string;
  description?: string;
  address?: BusinessAddress;
  location?: BusinessLocation;
  radius?: number;
  images?: BusinessImage[];
  logo?: BusinessImage;
  coverImage?: BusinessImage;
  documents?: BusinessDocuments;
  kycStatus: 'pending' | 'in_review' | 'verified' | 'approved' | 'rejected';
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  qrCode?: string | null;
  rating: {
    average: number;
    count: number;
  };
  reviewCount: number;
  openingHours?: OpeningHours;
  socialMedia?: {
    website?: string;
  };
  externalProfiles?: {
    tripAdvisor?: {
      profileUrl?: string;
      lastSynced?: string;
      commonNinjaWidgetId?: string;
      commonNinjaWidgetUrl?: string;
    };
    googleBusiness?: {
      businessName?: string;
      placeId?: string;
      rating?: number;
      reviewCount?: number;
      lastSynced?: string;
    };
  };
  externalReviews?: {
    tripAdvisor?: ExternalReviewItem[];
    google?: ExternalReviewItem[];
  };
  visitCount?: number;
  lastReviewAt?: string | null;
  claimRequest?: ClaimRequest;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;

  // Distance (appended by nearby API)
  distance?: number;
}

/** Lightweight card version returned by listings */
export type BusinessCard = Pick<
  Business,
  '_id' | 'name' | 'category' | 'address' | 'logo' | 'coverImage' | 'rating' | 'reviewCount' | 'status' | 'distance' | 'location'
>;

export interface Category {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
}

/** BusinessUpdate = offers, announcements, updates posted by owner */
export interface BusinessUpdate {
  _id: string;
  business: string; // ObjectId ref
  type: 'offer' | 'update' | 'announcement';
  title: string;
  description: string;
  image?: BusinessImage;
  discountType?: 'percentage' | 'fixed' | 'none';
  discountValue?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  viewCount?: number;
  createdBy?: string;
  notificationSentAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessDashboardData {
  business: Business;
  stats: {
    totalReviews: number;
    averageRating: number;
    totalVisits: number;
    totalCoupons?: number;
    activeCoupons?: number;
  };
  recentReviews?: unknown[];
  recentUpdates?: BusinessUpdate[];
}

export interface NearbyBusinessesParams {
  latitude: number;
  longitude: number;
  radius?: number;
  page?: number;
  limit?: number;
  category?: string;
  ratingSource?: string;
  minRating?: number;
  distance?: string;
}

export interface SearchBusinessesParams {
  query: string;
  category?: string;
  page?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
}

export interface BusinessListResponse {
  businesses: Business[];
  total: number;
  pagination: {
    page: number;
    pages: number;
    limit: number;
  };
}
