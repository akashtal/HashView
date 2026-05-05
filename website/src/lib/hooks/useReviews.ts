/**
 * useReviews — TanStack Query hooks for reviews
 * Replaces mobile's reviewSlice.js thunks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '@/lib/api';

export const REVIEW_KEYS = {
  forBusiness: (businessId: string, params?: Record<string, unknown>) =>
    ['reviews', 'business', businessId, params] as const,
  single: (id: string) => ['reviews', id] as const,
  userReviews: ['reviews', 'user'] as const,
  allForBusiness: (id: string) => ['reviews', 'all', id] as const,
};

/** All reviews for a business */
export function useBusinessReviews(
  businessId: string | null,
  params?: Record<string, unknown>
) {
  return useQuery({
    queryKey: REVIEW_KEYS.forBusiness(businessId ?? '', params),
    queryFn: () => ApiService.getBusinessReviews(businessId!, params),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data,
  });
}

/** All reviews including external (Google, TripAdvisor) */
export function useAllBusinessReviews(businessId: string | null) {
  return useQuery({
    queryKey: REVIEW_KEYS.allForBusiness(businessId ?? ''),
    queryFn: () => ApiService.getAllBusinessReviews(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Current user's reviews */
export function useUserReviews(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...REVIEW_KEYS.userReviews, params],
    queryFn: () => ApiService.getUserReviews(params),
    staleTime: 2 * 60 * 1000,
  });
}

/** Mark a review as helpful */
export function useMarkHelpful(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => ApiService.markHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.forBusiness(businessId) });
    },
  });
}

/** Sync Google reviews (business owner action) */
export function useSyncGoogleReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => ApiService.syncGoogleReviews(businessId),
    onSuccess: (_, businessId) => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.allForBusiness(businessId) });
    },
  });
}

/** Sync TripAdvisor reviews (business owner action) */
export function useSyncTripAdvisorReviews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => ApiService.syncTripAdvisorReviews(businessId),
    onSuccess: (_, businessId) => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.allForBusiness(businessId) });
    },
  });
}
