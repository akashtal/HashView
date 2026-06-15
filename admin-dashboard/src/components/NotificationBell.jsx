import React, { useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, ShoppingBag, Package, Megaphone, Star, Info, Gift } from 'lucide-react';

// ── Icon & colour per notification type ────────────────────────────────────
function getTypeStyle(type) {
  switch ((type || '').toLowerCase()) {
    case 'order_placed':
      return { Icon: ShoppingBag, bg: 'bg-amber-100', text: 'text-amber-600' };
    case 'order_status':
      return { Icon: Package, bg: 'bg-violet-100', text: 'text-violet-600' };
    case 'admin_broadcast':
    case 'announcement':
    case 'promotion':
      return { Icon: Megaphone, bg: 'bg-red-100', text: 'text-red-500' };
    case 'review':
      return { Icon: Star, bg: 'bg-blue-100', text: 'text-blue-500' };
    case 'coupon':
      return { Icon: Gift, bg: 'bg-green-100', text: 'text-green-600' };
    default:
      return { Icon: Info, bg: 'bg-gray-100', text: 'text-gray-500' };
  }
}

// ── Relative timestamp ──────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * NotificationBell — drop-in notification bell for any dashboard topbar.
 *
 * Props:
 *   notifications  – array from useNotifications hook
 *   unreadCount    – number
 *   open           – boolean
 *   loading        – boolean
 *   onToggle       – () => void
 *   onMarkRead     – (id) => void
 *   onMarkAllRead  – () => void
 *   onClose        – () => void
 *   onViewAll      – () => void   (navigate to full notifications page)
 *   accentColor    – tailwind colour string, e.g. 'purple' | 'indigo' (default 'indigo')
 */
export default function NotificationBell({
  notifications = [],
  unreadCount   = 0,
  open          = false,
  loading       = false,
  onToggle,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onViewAll,
  accentColor   = 'indigo',
}) {
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const accent = {
    purple: { ring: 'ring-purple-500', badge: 'bg-purple-600', hover: 'hover:bg-purple-50' },
    indigo: { ring: 'ring-indigo-500', badge: 'bg-indigo-600', hover: 'hover:bg-indigo-50' },
  }[accentColor] || { ring: 'ring-indigo-500', badge: 'bg-indigo-600', hover: 'hover:bg-indigo-50' };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={onToggle}
        className={`relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition focus:outline-none ${open ? 'bg-gray-100' : ''}`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] ${accent.badge} text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${accent.badge} text-white`}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  All read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 25).map((notif) => {
                const isUnread = notif.status !== 'read';
                const { Icon, bg, text } = getTypeStyle(notif.type);
                return (
                  <div
                    key={notif._id}
                    className={`flex gap-3 px-4 py-3 cursor-pointer transition ${isUnread ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                    onClick={() => isUnread && onMarkRead(notif._id)}
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full ${bg} flex items-center justify-center mt-0.5`}>
                      <Icon size={16} className={text} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug truncate ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>

                    {/* Mark-read action */}
                    {isUnread && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notif._id); }}
                        className="flex-shrink-0 p-1 rounded hover:bg-white text-gray-300 hover:text-green-500 transition mt-0.5"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {onViewAll && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={() => { onClose?.(); onViewAll(); }}
                className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition text-center py-1 rounded hover:bg-indigo-50"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
