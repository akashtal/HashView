"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@/lib/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { NotificationSkeleton } from "@/components/app/Skeletons";
import { StaggerList, StaggerItem } from "@/components/app/FadeIn";
import { useGuestGuard } from "@/lib/hooks/useGuestGuard";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_ICONS: Record<string, string> = {
  coupon: "🎁", review: "⭐", business_update: "📢", system: "⚙️",
  kyc: "🔒", promotion: "🏷️", announcement: "📣", general: "🔔",
};

function NotificationItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const isUnread = notif.status !== "read";
  const icon = TYPE_ICONS[notif.type] || "🔔";

  return (
    <button
      onClick={() => isUnread && onRead(notif._id)}
      className={cn(
        "w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200",
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-card border-border hover:bg-muted/40",
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0",
        isUnread ? "bg-primary/15" : "bg-muted"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-semibold text-sm leading-tight", isUnread ? "text-foreground" : "text-muted-foreground")}>
            {notif.title}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(notif.createdAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
      </div>
      {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
    </button>
  );
}

export default function NotificationsPage() {
  const redirecting = useGuestGuard();
  const { data, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  if (redirecting) return null;

  const handleMarkAll = async () => {
    await markAllRead.mutateAsync();
    refetch();
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto relative px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-white/70 text-sm">{unreadCount} unread</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={markAllRead.isPending}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                )}
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
              <Bell className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">All caught up!</h2>
            <p className="text-muted-foreground text-sm">No notifications yet. We&apos;ll notify you about updates and offers.</p>
          </div>
        ) : (
          <StaggerList className="space-y-2">
            {notifications.map((n) => (
              <StaggerItem key={n._id}>
                <NotificationItem
                  notif={n}
                  onRead={(id) => markRead.mutate(id)}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
