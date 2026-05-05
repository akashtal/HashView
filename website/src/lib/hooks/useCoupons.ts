/**
 * useCoupons — TanStack Query hooks for coupons
 * Replaces mobile's couponSlice.js thunks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '@/lib/api';
import type { BusinessCoupon } from '@/lib/types';

export const COUPON_KEYS = {
  userCoupons: (params?: Record<string, unknown>) => ['coupons', 'user', params] as const,
  forBusiness: (businessId: string) => ['coupons', 'business', businessId] as const,
  businessCoupons: (businessId: string) => ['coupons', 'business-promo', businessId] as const,
  template: (businessId: string) => ['coupons', 'template', businessId] as const,
  stats: (businessId: string) => ['coupons', 'stats', businessId] as const,
};

/** User's earned review-reward coupons */
export function useUserCoupons(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: COUPON_KEYS.userCoupons(params),
    queryFn: () => ApiService.getUserCoupons(params),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.coupons,
  });
}

/** Review-reward coupons for a business (public view) */
export function useBusinessReviewCoupons(businessId: string | null) {
  return useQuery({
    queryKey: COUPON_KEYS.forBusiness(businessId ?? ''),
    queryFn: () => ApiService.getBusinessCoupons(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.coupons,
  });
}

/** Promotional coupons created by business owner */
export function useBusinessPromoCoupons(businessId: string | null) {
  return useQuery({
    queryKey: COUPON_KEYS.businessCoupons(businessId ?? ''),
    queryFn: () => ApiService.getBusinessCouponsList(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.coupons,
  });
}

/** Coupon template for business (review reward settings) */
export function useCouponTemplate(businessId: string | null) {
  return useQuery({
    queryKey: COUPON_KEYS.template(businessId ?? ''),
    queryFn: () => ApiService.getBusinessCouponTemplate(businessId!),
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000,
    select: (data) => data.template,
  });
}

/** Redemption stats for business */
export function useRedemptionStats(businessId: string | null) {
  return useQuery({
    queryKey: COUPON_KEYS.stats(businessId ?? ''),
    queryFn: () => ApiService.getRedemptionStats(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Create promotional coupon */
export function useCreateBusinessCoupon(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessCoupon>) => ApiService.createBusinessCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUPON_KEYS.businessCoupons(businessId) });
    },
  });
}

/** Update promotional coupon */
export function useUpdateBusinessCoupon(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BusinessCoupon> }) =>
      ApiService.updateBusinessCoupon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUPON_KEYS.businessCoupons(businessId) });
    },
  });
}

/** Delete promotional coupon */
export function useDeleteBusinessCoupon(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiService.deleteBusinessCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUPON_KEYS.businessCoupons(businessId) });
    },
  });
}

/** Toggle coupon active/inactive */
export function useToggleCouponStatus(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiService.toggleCouponStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUPON_KEYS.businessCoupons(businessId) });
    },
  });
}
