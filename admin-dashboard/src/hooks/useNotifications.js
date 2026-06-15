import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useNotifications — polls backend for notifications.
 * Works with both the admin axios instance and the business axios instance.
 *
 * @param {object} apiInstance  - axios instance with auth interceptor already set
 * @param {number} pollMs       - polling interval in milliseconds (default 30s)
 */
export default function useNotifications(apiInstance, pollMs = 30000) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [open, setOpen]                   = useState(false);
  const intervalRef                       = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiInstance.get('/notifications');
      const data = res.data;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Silently ignore — don't break the layout on notification errors
    } finally {
      setLoading(false);
    }
  }, [apiInstance]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, pollMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications, pollMs]);

  const markAsRead = useCallback(async (id) => {
    try {
      await apiInstance.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, status: 'read' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [apiInstance]);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiInstance.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [apiInstance]);

  const toggleOpen = useCallback(() => setOpen(o => !o), []);
  const closeDropdown = useCallback(() => setOpen(false), []);

  return {
    notifications,
    unreadCount,
    loading,
    open,
    toggleOpen,
    closeDropdown,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
