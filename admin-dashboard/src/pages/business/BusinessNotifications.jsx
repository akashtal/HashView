import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, ShoppingBag, Package, Megaphone, Star, Info, Gift, RefreshCw } from 'lucide-react';
import { businessApi } from '../../context/BusinessAuthContext';

// ── Icon & colour per notification type ────────────────────────────────────
function getTypeStyle(type) {
  switch ((type || '').toLowerCase()) {
    case 'order_placed':
      return { Icon: ShoppingBag, bg: 'bg-amber-100', text: 'text-amber-600', label: 'New Order', labelColor: 'bg-amber-100 text-amber-700' };
    case 'order_status':
      return { Icon: Package,     bg: 'bg-violet-100', text: 'text-violet-600', label: 'Order Update', labelColor: 'bg-violet-100 text-violet-700' };
    case 'admin_broadcast':
    case 'announcement':
      return { Icon: Megaphone,   bg: 'bg-red-100',    text: 'text-red-500',    label: 'Announcement', labelColor: 'bg-red-100 text-red-700' };
    case 'review':
      return { Icon: Star,        bg: 'bg-blue-100',   text: 'text-blue-500',   label: 'Review', labelColor: 'bg-blue-100 text-blue-700' };
    case 'coupon':
      return { Icon: Gift,        bg: 'bg-green-100',  text: 'text-green-600',  label: 'Coupon', labelColor: 'bg-green-100 text-green-700' };
    default:
      return { Icon: Info,        bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'General', labelColor: 'bg-gray-100 text-gray-600' };
  }
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FILTERS = ['All', 'Unread', 'Orders', 'Announcements'];

export default function BusinessNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filter, setFilter]               = useState('All');
  const [total, setTotal]                 = useState(0);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [page, setPage]                   = useState(1);
  const LIMIT = 20;

  const fetchNotifications = useCallback(async (pageNum = 1, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = { page: pageNum, limit: LIMIT };
      if (filter === 'Unread') params.status = 'unread';
      const res = await businessApi.get('/notifications', { params });
      const data = res.data;
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [filter]);

  const markAsRead = async (id) => {
    try {
      await businessApi.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'read' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      await businessApi.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const deleteNotification = async (id) => {
    try {
      await businessApi.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  // Client-side filter for order types
  const filtered = notifications.filter(n => {
    if (filter === 'Orders') return ['order_placed', 'order_status'].includes(n.type);
    if (filter === 'Announcements') return ['admin_broadcast', 'announcement', 'promotion'].includes(n.type);
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={22} className="text-purple-600" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(page, true)}
            disabled={refreshing}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              filter === f
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications found</p>
            <p className="text-xs mt-1">
              {filter !== 'All' ? 'Try switching to "All"' : "You'll see notifications here when they arrive"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map(notif => {
              const isUnread = notif.status !== 'read';
              const { Icon, bg, text, label, labelColor } = getTypeStyle(notif.type);
              return (
                <li
                  key={notif._id}
                  className={`flex items-start gap-4 px-5 py-4 transition group ${isUnread ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center mt-0.5`}>
                    <Icon size={18} className={text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${labelColor}`}>{label}</span>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                    </div>
                    <p className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {isUnread && (
                      <button
                        onClick={() => markAsRead(notif._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition"
                        title="Mark as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Showing {filtered.length} of {total}</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => { const p = page - 1; setPage(p); fetchNotifications(p); }}
                className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                disabled={page * LIMIT >= total}
                onClick={() => { const p = page + 1; setPage(p); fetchNotifications(p); }}
                className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
