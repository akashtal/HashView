"use client";

import { cn } from "@/lib/utils";

// ─── Shared pulse wrapper ──────────────────────────────────────────────────────
function Pulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

// ─── Business Card Skeleton ────────────────────────────────────────────────────
export function BusinessCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Pulse className="h-48 rounded-none" />
      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Pulse className="w-8 h-8 rounded-lg shrink-0" />
          <Pulse className="h-4 flex-1 max-w-[60%]" />
        </div>
        <Pulse className="h-3 w-2/5" />
        <div className="flex items-center gap-2">
          <Pulse className="h-3 w-12" />
          <Pulse className="h-3 w-10" />
          <Pulse className="h-3 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
}

// ─── Business Card Grid Skeleton (common usage pattern) ───────────────────────
export function BusinessGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Review Card Skeleton ──────────────────────────────────────────────────────
export function ReviewCardSkeleton() {
  return (
    <div className="py-5 border-b border-border last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <Pulse className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3.5 w-32" />
          <Pulse className="h-3 w-24" />
        </div>
        <Pulse className="h-6 w-12 rounded-full" />
      </div>
      <Pulse className="h-3 w-full mb-1.5" />
      <Pulse className="h-3 w-4/5 mb-1.5" />
      <Pulse className="h-3 w-3/5" />
    </div>
  );
}

// ─── Coupon Card Skeleton ──────────────────────────────────────────────────────
export function CouponCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Pulse className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
          <Pulse className="h-5 w-12 rounded-full shrink-0" />
        </div>
        <Pulse className="h-7 w-28 rounded-xl" />
      </div>
      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
        <div className="space-y-1">
          <Pulse className="h-2.5 w-8" />
          <Pulse className="h-4 w-20" />
        </div>
        <div className="space-y-1 text-right">
          <Pulse className="h-2.5 w-16 ml-auto" />
          <Pulse className="h-3 w-14 ml-auto" />
        </div>
      </div>
    </div>
  );
}

// ─── Notification Item Skeleton ────────────────────────────────────────────────
export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border last:border-0">
      <Pulse className="w-10 h-10 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-3.5 w-3/4" />
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ─── Dashboard KPI Skeleton ────────────────────────────────────────────────────
export function KPISkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-3 w-24" />
        <Pulse className="w-9 h-9 rounded-xl" />
      </div>
      <Pulse className="h-8 w-16" />
      <Pulse className="h-2.5 w-20" />
    </div>
  );
}

// ─── Generic content block skeletons ──────────────────────────────────────────
export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
