"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, RefreshCw, Inbox } from "lucide-react";
import { useNotifications, useUnreadNotificationCount } from "@/lib/hooks/useNotifications";
import ApiService from "@/lib/api";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Notification item ────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  review: "⭐",
  coupon: "🎟️",
  update: "📢",
  visit: "👣",
  system: "🔔",
  subscription: "👑",
};

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const n = notification;
  const type = n.type as string;
  const icon = TYPE_ICONS[type] ?? "🔔";
  const isRead = n.status === "read";
  const date = new Date(notification.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex gap-4 rounded-2xl border p-4 transition-all duration-200",
        isRead
          ? "border-border bg-card"
          : "border-primary/20 bg-primary/5"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
        isRead ? "bg-muted" : "bg-primary/10"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", isRead ? "text-foreground" : "text-foreground")}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">{date}</p>
      </div>

      {/* Mark read */}
      {!isRead && (
        <div className="flex items-start shrink-0">
          <button
            onClick={() => onMarkRead(notification._id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 ml-1" />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [markingAll, setMarkingAll] = useState(false);
  const { data, isLoading, refetch } = useNotifications({ limit: 50 });
  const { refetch: refetchCount } = useUnreadNotificationCount();

  const notifications: Notification[] = data?.notifications ?? [];
  const unread = notifications.filter((n) => n.status !== "read");

  const handleMarkRead = async (id: string) => {
    await ApiService.markAsRead(id);
    refetch();
    refetchCount();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await ApiService.markAllRead();
      refetch();
      refetchCount();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {unread.length > 0 && (
            <Button size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
              {markingAll ? (
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5 mr-2" />
              )}
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Unread banner */}
      {unread.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm text-primary font-medium">
            You have {unread.length} unread notification{unread.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 animate-pulse"
            >
              <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-2 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-foreground mb-2">No notifications yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            You&apos;ll see new reviews, visits, and system alerts here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Unread first */}
          {unread.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Unread ({unread.length})
              </h2>
              {unread.map((n) => (
                <NotificationItem key={n._id} notification={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}

          {/* Read */}
          {notifications.filter((n) => n.status === "read").length > 0 && (
            <div className="space-y-2 mt-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Earlier
              </h2>
              {notifications.filter((n) => n.status === "read").map((n) => (
                <NotificationItem key={n._id} notification={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
