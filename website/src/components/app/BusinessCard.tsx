"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Eye, Clock, ShieldCheck, Flag, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Business } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVisitCount(n?: number): string | null {
  if (!n || n < 1) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${n}`;
}

function formatLastReview(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  if (mins < 2) return "Recent review";
  if (mins < 60) return `Review ${mins}m ago`;
  if (hours < 24) return `Review ${hours}h ago`;
  if (days < 30) return `Last Review ${days} day${days > 1 ? "s" : ""} ago`;
  if (months < 12) return `Last Review ${months} month${months > 1 ? "s" : ""} ago`;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BusinessCardProps {
  business: Business;
  className?: string;
}

export function BusinessCard({ business, className }: BusinessCardProps) {
  const coverUrl =
    business.coverImage?.url || business.images?.[0]?.url || business.logo?.url || null;

  const googleRating = business.externalProfiles?.googleBusiness?.rating;
  const googleCount = business.externalProfiles?.googleBusiness?.reviewCount;
  const hashviewRating = business.rating?.average || 0;
  const hashviewCount = business.rating?.count || 0;

  const locationText =
    business.address?.fullAddress ||
    [business.address?.area, business.address?.city].filter(Boolean).join(", ") ||
    business.address?.city ||
    business.address?.street ||
    "Location not specified";

  const categoryLabel = (business.category || "Business")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const isVerified =
    !!business.owner || business.claimRequest?.status === "approved";
  const isPendingClaim = business.claimRequest?.status === "pending";

  const visitCount = formatVisitCount(business.visitCount);
  const lastReview = formatLastReview(business.lastReviewAt);
  const distanceKm = business.distance;

  return (
    <Link
      href={`/business/${business._id}`}
      className={cn(
        "group block rounded-2xl overflow-hidden border border-border bg-card",
        "transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        "hover:-translate-y-0.5",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-violet-900 to-purple-800">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={business.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={coverUrl.includes('googleusercontent.com')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Top-right badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {hashviewRating > 0 && (
            <div className="flex items-center gap-1 bg-violet-700/90 backdrop-blur-sm rounded-full px-2 py-0.5 border border-yellow-400/30">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-yellow-300 font-semibold text-[11px]">
                {hashviewRating.toFixed(1)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
            <Eye className="w-3 h-3 text-white" />
            {visitCount && (
              <span className="text-white font-semibold text-[11px]">{visitCount}</span>
            )}
          </div>
        </div>

        {/* Distance badge */}
        {distanceKm !== undefined && distanceKm > 0 && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/95 rounded-full px-2 py-0.5 shadow">
            <MapPin className="w-2.5 h-2.5 text-orange-500" />
            <span className="text-gray-800 font-semibold text-[10px]">
              {distanceKm < 1
                ? `${(distanceKm * 1000).toFixed(0)}m`
                : `${distanceKm.toFixed(1)}km`}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Name + Location */}
        <div className="mb-2.5">
          <h3 className="font-bold text-foreground text-[15px] truncate group-hover:text-primary transition-colors">
            {business.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-xs truncate">{locationText}</span>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="bg-orange-50 border border-orange-200 dark:bg-orange-950/40 dark:border-orange-800/40 text-orange-600 dark:text-orange-400 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {categoryLabel}
          </span>
          {isVerified ? (
            <span className="flex items-center gap-1 bg-green-50 border border-green-200 dark:bg-green-950/40 dark:border-green-800/40 text-green-700 dark:text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          ) : isPendingClaim ? (
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              <Timer className="w-2.5 h-2.5" /> Pending
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              <Flag className="w-2.5 h-2.5" /> Unclaimed
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{hashviewCount} reviews</span>
          {lastReview && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
              <Clock className="w-2.5 h-2.5" />
              {lastReview}
            </span>
          )}
        </div>

        {/* Google rating bar */}
        {googleRating && (
          <div className="mt-2.5 flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Google</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[12px] font-bold text-foreground">{googleRating.toFixed(1)}</span>
              {googleCount && (
                <span className="text-[10px] text-muted-foreground">({Number(googleCount).toLocaleString()})</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
