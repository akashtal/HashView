"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

const AVATAR_COLORS = [
  "#6C47FF", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899",
];

const CATEGORY_KEYS = [
  { key: "staff", label: "Staff" },
  { key: "facilities", label: "Facilities" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "comfort", label: "Comfort" },
  { key: "valueForMoney", label: "Value" },
  { key: "location", label: "Location" },
] as const;

interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className }: ReviewCardProps) {
  const user = typeof review.user === "object" ? review.user : null;
  const name = user?.name || "Anonymous";
  const initial = name.charAt(0).toUpperCase();
  const avatarColor = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
  const timeAgo = formatRelativeTime(review.updatedAt || review.createdAt);
  const score = (review.rating * 2).toFixed(0);

  const ratedCategories = CATEGORY_KEYS.filter(
    ({ key }) => review.categoryRatings?.[key]
  );

  return (
    <div className={cn("pb-5 border-b border-border last:border-0 last:pb-0", className)}>
      {/* Reviewer row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg"
          style={{ backgroundColor: avatarColor }}
        >
          {user?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImage} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{name}</p>
          <p className="text-xs text-primary font-semibold">{timeAgo}</p>
        </div>

        {/* Score badge */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-black">{score}</span>
        </div>
      </div>

      {/* Stars + emotion */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("w-3.5 h-3.5", i < review.rating ? "fill-orange-400 text-orange-400" : "text-muted fill-muted")}
            />
          ))}
        </div>
        {review.emotion && (
          <span className="text-xs text-muted-foreground">· {review.emotion}</span>
        )}
      </div>

      {/* Comment */}
      <p className="text-sm text-foreground leading-relaxed mb-3">{review.comment}</p>

      {/* Category rating pills */}
      {ratedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ratedCategories.map(({ key, label }) => {
            const val = review.categoryRatings![key]!;
            const color =
              val >= 8 ? "#10B981" : val >= 6 ? "#F59E0B" : "#EF4444";
            return (
              <span
                key={key}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {label} {val.toFixed(1)}
              </span>
            );
          })}
        </div>
      )}

      {/* Photos */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {review.images.map((img, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={idx}
              src={img.url}
              alt="Review photo"
              className="w-24 h-24 rounded-xl object-cover shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            />
          ))}
        </div>
      )}
    </div>
  );
}
