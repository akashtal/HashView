/**
 * useBusinesses — TanStack Query hooks for business data
 * Replaces mobile's businessSlice.js thunks
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import ApiService from '@/lib/api';
import type { Business, NearbyBusinessesParams, SearchBusinessesParams, BusinessUpdate } from '@/lib/types';

export const BUSINESS_KEYS = {
  all: ['businesses'] as const,
  list: (params?: Record<string, unknown>) => ['businesses', 'list', params] as const,
  nearby: (params?: NearbyBusinessesParams) => ['businesses', 'nearby', params] as const,
  search: (params?: SearchBusinessesParams) => ['businesses', 'search', params] as const,
  detail: (id: string) => ['businesses', 'detail', id] as const,
  my: () => ['businesses', 'my'] as const,
  dashboard: (id: string) => ['businesses', 'dashboard', id] as const,
  updates: (businessId: string) => ['businesses', 'updates', businessId] as const,
  categories: ['categories'] as const,
};

/** Paginated list of all active businesses */
export function useAllBusinesses(params?: Record<string, unknown>, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: BUSINESS_KEYS.list(params),
    queryFn: ({ pageParam = 1 }) =>
      ApiService.getAllActiveBusinesses({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 10 * 60 * 1000,  // 10 min in memory
    enabled: options?.enabled,
  });
}

/** Nearby businesses based on coordinates */
export function useNearbyBusinesses(params: NearbyBusinessesParams | null) {
  return useInfiniteQuery({
    queryKey: BUSINESS_KEYS.nearby(params ?? undefined),
    queryFn: ({ pageParam = 1 }) => ApiService.getNearbyBusinesses({ ...params!, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination?.page < pagination?.pages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!params?.latitude && !!params?.longitude,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Search businesses */
export function useSearchBusinesses(params: SearchBusinessesParams | null) {
  return useInfiniteQuery({
    queryKey: BUSINESS_KEYS.search(params ?? undefined),
    queryFn: ({ pageParam = 1 }) => ApiService.searchBusinesses({ ...params!, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination?.page < pagination?.pages ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!params?.query && params.query.length >= 2,
    staleTime: 60 * 1000,
  });
}

/** Single business detail */
export function useBusiness(id: string | null) {
  return useQuery({
    queryKey: BUSINESS_KEYS.detail(id ?? ''),
    queryFn: () => ApiService.getBusiness(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // business details cached 15 min
    select: (data) => data.business,
  });
}

/** Current owner's businesses */
export function useMyBusinesses() {
  return useQuery({
    queryKey: BUSINESS_KEYS.my(),
    queryFn: () => ApiService.getMyBusinesses(),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.businesses,
  });
}

/** Business dashboard data for owner */
export function useBusinessDashboard(id: string | null) {
  return useQuery({
    queryKey: BUSINESS_KEYS.dashboard(id ?? ''),
    queryFn: () => ApiService.getBusinessDashboard(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/** All categories */
export function useCategories() {
  return useQuery({
    queryKey: BUSINESS_KEYS.categories,
    queryFn: () => ApiService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 min — categories rarely change
    gcTime: 60 * 60 * 1000,  // 1 hour — keep categories forever
    select: (data) => data.categories,
  });
}

/** Business updates (offers, announcements) */
export function useBusinessUpdates(businessId: string | null) {
  return useQuery({
    queryKey: BUSINESS_KEYS.updates(businessId ?? ''),
    queryFn: () => ApiService.getBusinessUpdates(businessId!),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.updates,
  });
}

/** Toggle favorite business */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => ApiService.toggleFavoriteBusiness(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/** Update business info */
export function useUpdateBusiness(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Business>) => ApiService.updateBusiness(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: BUSINESS_KEYS.dashboard(id) });
    },
  });
}

/** Create business update (offer / announcement) */
export function useCreateBusinessUpdate(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessUpdate>) => ApiService.createBusinessUpdate(data as Partial<BusinessUpdate> & { business: string }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_KEYS.updates(businessId) });
    },
  });
}

/** Delete business update */
export function useDeleteBusinessUpdate(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiService.deleteBusinessUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_KEYS.updates(businessId) });
    },
  });
}
