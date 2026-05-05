"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Star,
  Ticket,
  Megaphone,
  Building2,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Crown,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/coupons", label: "Coupons", icon: Ticket },
  { href: "/dashboard/updates", label: "Updates", icon: Megaphone },
  { href: "/dashboard/profile", label: "Business Profile", icon: Building2 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface DashboardSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function DashboardSidebar({ collapsed = false, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isPro, subscription } = useAuth();

  const businessName =
    (user as unknown as Record<string, unknown>)?.businessName as string | undefined;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-border shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-display font-bold text-foreground text-sm leading-tight block truncate">
              HashView
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight block">
              Business Portal
            </span>
          </div>
        )}
      </div>

      {/* Business identity chip */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              {businessName && (
                <p className="text-[10px] text-muted-foreground truncate">{businessName}</p>
              )}
            </div>
            {isPro ? (
              <Crown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            ) : (
              <BadgeCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative",
                collapsed && "justify-center px-0 py-3",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-transform duration-200",
                  active && "scale-110"
                )}
              />
              {!collapsed && <span>{label}</span>}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pro badge */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border shrink-0">
          {isPro ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
              <Crown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Pro Plan</p>
                {subscription?.currentPeriodEnd && (
                  <p className="text-[10px] text-muted-foreground">
                    Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity"
            >
              <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary">Upgrade to Pro</p>
                <p className="text-[10px] text-muted-foreground">Unlock all features</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Logout */}
      <div
        className={cn(
          "px-2 pb-4 shrink-0",
          collapsed && "flex justify-center"
        )}
      >
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150",
            collapsed && "justify-center px-0 py-3 w-10"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      )}
    </aside>
  );
}
