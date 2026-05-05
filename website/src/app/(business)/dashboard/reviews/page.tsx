"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, MessageSquare, RefreshCw, Search } from "lucide-react";
import ApiService from "@/lib/api";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


// ─── Review row ───────────────────────────────────────────────────────────────

function ReviewRow({ review }: { review: Review }) {
  const user = typeof review.user === "object" ? review.user : null;
  const name = user?.name ?? "Anonymous";
  const rating = review.rating ?? 0;
  const comment = review.comment ?? "";
  const emotion = review.emotion ? [review.emotion] : [];
  const images = review.images ?? [];
  const helpfulCount = review.helpful?.length ?? 0;
  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("w-3.5 h-3.5", i < rating ? "fill-amber-400 text-amber-400" : "text-muted")}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      {comment && (
        <p className="text-sm text-foreground/80 leading-relaxed">{comment}</p>
      )}

      {/* Emotions / mood */}
      {emotion.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emotion.filter(Boolean).map((e, i) => (
            <span
              key={i}
              className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-medium"
            >
              {String(e)}
            </span>
          ))}
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.slice(0, 4).map((p, i) => (
            <img
              key={i}
              src={p.url}
              alt={`Review photo ${i + 1}`}
              className="w-16 h-16 object-cover rounded-xl border border-border"
            />
          ))}
        </div>
      )}

      {/* Helpful count */}
      {helpfulCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ThumbsUp className="w-3 h-3" />
          {helpfulCount} found this helpful
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    ApiService.getMyBusinesses()
      .then((res) => {
        const id = res.businesses?.[0]?._id;
        setMyBusinessId(id ?? null);
        if (id) {
          return ApiService.getBusinessReviews(id);
        }
      })
      .then((res) => {
        if (res) setReviews(res.reviews ?? []);
      })
      .catch(() => setError("Failed to load reviews"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reviews.filter((r) => {
    if (filterRating !== null && r.rating !== filterRating) return false;
    if (search && !(r.comment ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "–";

  const reload = () => {
    if (!myBusinessId) return;
    setLoading(true);
    ApiService.getBusinessReviews(myBusinessId)
      .then((res) => setReviews(res.reviews ?? []))
      .catch(() => setError("Failed to reload"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} · Avg {avgRating} ★
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Rating summary */}
      <div className="grid grid-cols-5 gap-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviews.filter((r) => r.rating === star).length;
          const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
          return (
            <button
              key={star}
              onClick={() => setFilterRating(filterRating === star ? null : star)}
              className={cn(
                "rounded-xl border p-3 text-center hover:opacity-80 transition-all",
                filterRating === star
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className={cn("w-3.5 h-3.5", filterRating === star ? "fill-amber-400 text-amber-400" : "text-amber-400")} />
                <span className="text-sm font-bold text-foreground">{star}</span>
              </div>
              <p className="text-xs text-muted-foreground">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search review text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-1/6" />
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No reviews found</h3>
          <p className="text-muted-foreground text-sm">
            {reviews.length === 0
              ? "No reviews yet — customers will leave reviews after visiting."
              : "No reviews match your current filter."}
          </p>
          {filterRating !== null && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setFilterRating(null)}
            >
              Clear filter
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <ReviewRow key={review._id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
