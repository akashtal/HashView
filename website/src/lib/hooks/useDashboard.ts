/**
 * useDashboard — TanStack Query hooks for business owner dashboard
 * Replaces AnalyticsDashboardScreen + BusinessAnalyticsScreen data fetching
 */
import { useQuery } from '@tanstack/react-query';
import ApiService from '@/lib/api';
import { BUSINESS_KEYS } from './useBusinesses';
import { REVIEW_KEYS } from './useReviews';
import { COUPON_KEYS } from './useCoupons';

/** Full dashboard aggregate for a business owner */
export function useBusinessDashboardFull(businessId: string | null) {
  const dashboard = useQuery({
    queryKey: BUSINESS_KEYS.dashboard(businessId ?? ''),
    queryFn: () => ApiService.getBusinessDashboard(businessId!),
    enabled: !!businessId,
    staleTime: 60 * 1000,
  });

  const reviews = useQuery({
    queryKey: REVIEW_KEYS.forBusiness(businessId ?? ''),
    queryFn: () => ApiService.getBusinessReviews(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  const coupons = useQuery({
    queryKey: COUPON_KEYS.businessCoupons(businessId ?? ''),
    queryFn: () => ApiService.getBusinessCouponsList(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.coupons,
  });

  const redemptionStats = useQuery({
    queryKey: COUPON_KEYS.stats(businessId ?? ''),
    queryFn: () => ApiService.getRedemptionStats(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  const subscription = useQuery({
    queryKey: ['subscription', businessId],
    queryFn: () => ApiService.getSubscriptionStatus(),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    dashboard,
    reviews,
    coupons,
    redemptionStats,
    subscription,
    isLoading:
      dashboard.isLoading ||
      reviews.isLoading ||
      coupons.isLoading,
    isError:
      dashboard.isError ||
      reviews.isError,
  };
}

/** User's favorites for customer dashboard */
export function useFavoriteBusinesses() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => ApiService.getFavoriteBusinesses(),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.favorites,
  });
}

/** User's reward/visit history */
export function useRewardHistory(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['history', params],
    queryFn: () => ApiService.getRewardHistory(params),
    staleTime: 2 * 60 * 1000,
  });
}
