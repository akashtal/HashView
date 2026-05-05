/**
 * useNotifications — TanStack Query hooks for notifications
 * Replaces mobile's notificationSlice.js thunks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '@/lib/api';

export const NOTIFICATION_KEYS = {
  list: (params?: Record<string, unknown>) => ['notifications', params] as const,
  unread: ['notifications', 'unread'] as const,
};

/** All notifications for authenticated user */
export function useNotifications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => ApiService.getNotifications(params),
    staleTime: 30 * 1000, // 30 sec — notifications need to feel real-time
    refetchInterval: 60 * 1000, // poll every 1 min
  });
}

/** Unread count only (lightweight, used for badge) */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unread,
    queryFn: () => ApiService.getNotifications({ limit: 1 }),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data) => data.unreadCount,
  });
}

/** Mark single notification as read */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ApiService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Mark all notifications as read */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ApiService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
