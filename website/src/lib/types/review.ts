// ─── Review Types ────────────────────────────────────────────────────────────
// Mirrors: backend/models/Review.model.js

export type ReviewEmotion =
  | 'Delighted' | 'Relaxed' | 'Valued' | 'Excited' | 'Disappointed'
  | 'happy' | 'sad' | 'lovely' | 'grateful' | 'cool' | 'positive'
  | '🤩' | '🧘' | '🥰' | '🎉' | '☹️'
  | 'loved' | 'okay' | 'disappointed' | 'frustrated' | 'amazing'
  | 'blessed' | 'thankful' | 'excited' | 'in_love' | 'crazy'
  | 'blissful' | 'fantastic' | 'silly' | 'festive' | 'wonderful'
  | 'amused' | 'relaxed' | 'chill'
  | null;

export interface CategoryRatings {
  staff?: number | null;
  facilities?: number | null;
  cleanliness?: number | null;
  comfort?: number | null;
  valueForMoney?: number | null;
  location?: number | null;
}

export interface ReviewMedia {
  url: string;
  publicId?: string;
  thumbnail?: string; // for videos
  duration?: number;  // for videos (seconds)
}

export interface ReviewUser {
  _id: string;
  name: string;
  profileImage?: string;
}

export interface Review {
  _id: string;
  user: ReviewUser | string;
  business: string; // ObjectId ref
  rating: number; // 1–5
  comment: string;
  emotion?: ReviewEmotion;
  categoryRatings?: CategoryRatings;
  images?: ReviewMedia[];
  videos?: ReviewMedia[];
  geolocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'active' | 'removed';
  likes?: number;
  dislikes?: number;
  helpful?: string[]; // user ObjectIds who marked helpful
  couponAwarded?: boolean;
  coupon?: string; // ObjectId ref
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  pagination?: {
    page: number;
    pages: number;
  };
}
