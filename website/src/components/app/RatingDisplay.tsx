"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  rating: number; // 0–5
  count?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  count,
  size = "md",
  showCount = true,
  className,
}: RatingDisplayProps) {
  const starSizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const partial = !filled && i < rating;
          return (
            <div key={i} className="relative">
              <Star className={cn(starSizes[size], "text-muted-foreground/30")} />
              {(filled || partial) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: partial ? `${(rating % 1) * 100}%` : "100%" }}
                >
                  <Star className={cn(starSizes[size], "fill-amber-400 text-amber-400")} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className={cn("font-bold text-foreground", textSizes[size])}>
        {rating > 0 ? rating.toFixed(1) : "0.0"}
      </span>
      {showCount && count !== undefined && (
        <span className={cn("text-muted-foreground", textSizes[size])}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
