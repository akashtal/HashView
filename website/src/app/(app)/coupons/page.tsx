"use client";

import { Ticket, Smartphone, Apple } from "lucide-react";
import { useUserCoupons } from "@/lib/hooks/useCoupons";
import { DownloadAppBanner } from "@/components/app/DownloadAppBanner";
import { cn } from "@/lib/utils";
import type { Coupon } from "@/lib/types";
import Image from "next/image";

function CouponCard({ coupon }: { coupon: Coupon }) {
  const isExpired = coupon.validUntil ? new Date(coupon.validUntil) < new Date() : false;
  const isRedeemed = coupon.status === "redeemed";
  const isActive = !isExpired && !isRedeemed;

  return (
    <div className={cn(
      "relative rounded-2xl border overflow-hidden transition-all duration-200",
      isActive ? "border-primary/30 bg-card" : "border-border bg-muted/30 opacity-70"
    )}>
      {/* Dashed divider effect */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px border-t-2 border-dashed border-border pointer-events-none" />
      <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
      <div className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />

      {/* Top section */}
      <div className="p-4 pb-5">
        <div className="flex items-start gap-3">
          {typeof coupon.business === "object" && coupon.business?.logo?.url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0">
              <Image src={coupon.business.logo.url} alt={typeof coupon.business === "object" ? coupon.business.name : ""} width={48} height={48} className="object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-base leading-tight">{coupon.title || coupon.code}</h3>
            {typeof coupon.business === "object" && coupon.business?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{coupon.business.name}</p>
            )}
          </div>

          <div className={cn(
            "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
            isRedeemed ? "bg-muted text-muted-foreground" :
            isExpired ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400" :
            "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
          )}>
            {isRedeemed ? "Used" : isExpired ? "Expired" : "Active"}
          </div>
        </div>

        {coupon.description && (
          <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">{coupon.description}</p>
        )}

        {coupon.rewardValue && coupon.rewardType && (
          <div className="mt-2.5 inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 rounded-xl px-3 py-1">
            <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">
              {coupon.rewardType === "percentage"
                ? `${coupon.rewardValue}% OFF`
                : coupon.rewardType === "buy1get1"
                ? "Buy 1 Get 1 Free"
                : coupon.rewardType === "free_item"
                ? `Free ${coupon.itemName || "Item"}`
                : `£${coupon.rewardValue} OFF`}
            </span>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium">CODE</p>
          <p className="text-sm font-bold text-foreground font-mono tracking-wider">{coupon.code}</p>
        </div>
        {coupon.validUntil && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-medium">
              {isExpired ? "EXPIRED" : "VALID UNTIL"}
            </p>
            <p className={cn("text-xs font-semibold", isExpired ? "text-red-500" : "text-foreground")}>
              {new Date(coupon.validUntil).toLocaleDateString("en-GB")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const { data: coupons, isLoading } = useUserCoupons();
  const allCoupons = coupons ?? [];
  const active = allCoupons.filter((c) => c.status !== "redeemed" && (!c.validUntil || new Date(c.validUntil) >= new Date()));
  const past = allCoupons.filter((c) => c.status === "redeemed" || (c.validUntil && new Date(c.validUntil) < new Date()));

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">My Coupons</h1>
              <p className="text-white/70 text-sm">Your rewards and vouchers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Redemption gate */}
        <DownloadAppBanner feature="REDEEM_COUPON" className="mb-5" />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse border border-border" />
            ))}
          </div>
        ) : allCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
              <Ticket className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No coupons yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Visit businesses and scan their QR codes in the app to collect coupons and rewards.
            </p>
            <div className="flex gap-3">
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold">
                <Apple className="w-4 h-4" /> App Store
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                <Smartphone className="w-4 h-4" /> Google Play
              </a>
            </div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="mb-8">
                <h2 className="font-bold text-foreground mb-4 text-lg">Active ({active.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {active.map((c) => <CouponCard key={c._id} coupon={c} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground mb-4 text-lg text-muted-foreground">Used / Expired ({past.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {past.map((c) => <CouponCard key={c._id} coupon={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
