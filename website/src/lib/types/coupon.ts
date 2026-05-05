// ─── Coupon Types ────────────────────────────────────────────────────────────
// Mirrors: backend/models/Coupon.model.js + BusinessCoupon logic

export type RewardType = 'percentage' | 'fixed' | 'buy1get1' | 'free_drink' | 'free_item';
export type CouponStatus = 'active' | 'redeemed' | 'expired' | 'cancelled' | 'inactive';
export type CouponType = 'business' | 'review_reward';

/** Review-reward coupon (auto-issued after verified review) */
export interface Coupon {
  _id: string;
  business: string | { _id: string; name: string; logo?: { url: string } };
  type: CouponType;
  user?: string;
  review?: string;
  code: string;
  title?: string;
  description?: string;
  rewardType: RewardType;
  rewardValue: number;
  itemName?: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number | null;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number | null;
  usageCount?: number;
  redemptionLimit?: number | null;
  redemptionCount?: number;
  status: CouponStatus;
  isActive: boolean;
  redeemedAt?: string;
  redeemedBy?: string;
  qrCodeData?: string;
  terms?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Business promotional coupon (manual, created by owner) */
export interface BusinessCoupon {
  _id: string;
  business: string;
  title: string;
  description?: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'buy1get1' | 'free_item';
  discountValue: number;
  minOrderAmount?: number;
  maxUsage?: number;
  usageCount?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  terms?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CouponTemplate {
  _id: string;
  business: string;
  rewardType: RewardType;
  rewardValue: number;
  itemName?: string;
  description?: string;
  validDays?: number; // how many days from issue until expiry
  terms?: string;
  isActive: boolean;
}

export interface RedemptionStats {
  totalRedeemed: number;
  totalActive: number;
  totalExpired: number;
  recentRedemptions?: Coupon[];
}
