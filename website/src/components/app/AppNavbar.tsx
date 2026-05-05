"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Compass, Search, Heart, Bell, User, Building2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useUnreadNotificationCount } from "@/lib/hooks/useNotifications";
import dynamic from "next/dynamic";
const DownloadAppModal = dynamic(
  () => import("@/components/app/DownloadAppModal").then((m) => ({ default: m.DownloadAppModal })),
  { ssr: false }
);
import type { FeatureGateKey } from "@/lib/feature-gates";
import { useState } from "react";
import { QrCode } from "lucide-react";

const customerNav = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/account/profile", label: "Account", icon: User },
];

const businessNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/account/profile", label: "Account", icon: User },
];

export function AppNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: unreadCount } = useUnreadNotificationCount();
  const [gateFeature, setGateFeature] = useState<FeatureGateKey | null>(null);

  const isBusiness = user?.role === "business";
  const navItems = isBusiness ? businessNav : customerNav;

  return (
    <>
      {/* Top navbar (desktop) */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 bg-card/90 backdrop-blur-xl border-b border-border items-center px-6 gap-6">
        {/* Logo */}
        <Link href={isBusiness ? "/dashboard" : "/explore"} className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow">
            <Image src="/logo.png" alt="HashView" width={24} height={24} className="object-contain" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">HashView</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + "/");
            const isNotif = href === "/notifications";
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
                {isNotif && unreadCount && unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {!isBusiness && (
          <button
            onClick={() => setGateFeature("QR_SCAN")}
            className="hidden md:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors ml-4 shrink-0"
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </button>
        )}

        {/* User chip */}
        {user && (
          <Link href="/account/profile" className="flex items-center gap-2.5 ml-auto shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
            {isBusiness && <Building2 className="w-3.5 h-3.5 text-muted-foreground" />}
          </Link>
        )}
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border flex items-center safe-area-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + "/");
          const isNotif = href === "/notifications";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
                {isNotif && unreadCount && unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Scan FAB for Customers */}
      {!isBusiness && (
        <button
          onClick={() => setGateFeature("QR_SCAN")}
          className="md:hidden fixed bottom-20 right-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-primary/30 active:scale-95 transition-transform border-2 border-white/20"
        >
          <QrCode className="w-6 h-6" />
        </button>
      )}

      <DownloadAppModal feature={gateFeature} onClose={() => setGateFeature(null)} />
    </>
  );
}
