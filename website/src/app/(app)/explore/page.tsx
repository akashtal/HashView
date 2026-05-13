"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Bell, Gift, MapPin, RefreshCw, Navigation, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAllBusinesses, useNearbyBusinesses, useCategories } from "@/lib/hooks/useBusinesses";
import { useUserLocation, DEFAULT_LOCATION } from "@/lib/hooks/useUserLocation";
import { BusinessCard } from "@/components/app/BusinessCard";
import { CategoryFilter } from "@/components/app/CategoryFilter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { BusinessGridSkeleton } from "@/components/app/Skeletons";
import { StaggerList, StaggerItem, FadeIn } from "@/components/app/FadeIn";

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: categoriesData, isLoading: catLoading } = useCategories();

  const isGuest = user?.role === "guest" || user?.isGuest;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ─── Location ──────────────────────────────────────────────────────────────
  // Mirrors UserHomeScreen.js: request real location, cache it, fall back to London
  const { location: realLocation, loading: locationLoading, denied, hasRealLocation, retry: retryLocation } = useUserLocation();

  // Build the params object that's passed to the nearby API.
  // While we haven't resolved location yet (loading), keep it null so the
  // query stays disabled and we show a skeleton instead of a flash of London data.
  const nearbyParams = (() => {
    if (locationLoading) return null;                          // still waiting — hold
    if (realLocation) return { ...realLocation, radius: 20_000_000, category: selectedCategory || undefined };
    if (denied) return { ...DEFAULT_LOCATION, radius: 20_000_000, category: selectedCategory || undefined };
    return null;
  })();

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const {
    data: nearbyData,
    isLoading: nearbyLoading,
    refetch: refetchNearby,
    fetchNextPage: fetchNextNearby,
    hasNextPage: hasNextNearby,
    isFetchingNextPage: isFetchingNextNearby,
  } = useNearbyBusinesses(nearbyParams);

  // Fallback: all businesses (only enabled when we can't use nearby at all)
  const {
    data: allData,
    isLoading: allLoading,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingNextAll,
  } = useAllBusinesses(
    selectedCategory ? { category: selectedCategory } : undefined,
    { enabled: nearbyParams === null && !locationLoading }
  );

  const businesses = nearbyParams
    ? nearbyData?.pages.flatMap((p) => p.businesses) ?? []
    : allData?.pages.flatMap((p) => p.businesses) ?? [];

  const hasNextPage = nearbyParams ? hasNextNearby : hasNextAll;
  const isFetchingNextPage = nearbyParams ? isFetchingNextNearby : isFetchingNextAll;
  const fetchNextPage = nearbyParams ? fetchNextNearby : fetchNextAll;

  // ─── Infinite scroll ───────────────────────────────────────────────────────
  const { ref, inView } = useInView({ threshold: 0, rootMargin: "400px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isLoading = locationLoading || nearbyLoading || allLoading;

  const firstName = user?.name?.split(" ")[0] || "there";
  const categories = categoriesData ?? [];

  const handleRefresh = useCallback(() => {
    refetchNearby();
  }, [refetchNearby]);

  // ─── Location status label ─────────────────────────────────────────────────
  const locationLabel = (() => {
    if (locationLoading) return "Getting your location...";
    if (hasRealLocation) return "Showing businesses near you";
    if (denied) return "Location unavailable — showing all businesses";
    return "Showing all businesses";
  })();

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Hi {firstName} 👋
              </h1>
              <p className="text-white/70 text-sm mt-0.5">Discover amazing businesses</p>
            </div>
            <div className="flex items-center gap-2.5">
              {!isGuest && (
                <>
                  <Link
                    href="/notifications"
                    className="relative w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                  >
                    <Bell className="w-4.5 h-4.5 text-white" />
                  </Link>
                  <Link
                    href="/coupons"
                    className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                  >
                    <Gift className="w-4.5 h-4.5 text-white" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Search bar */}
          <button
            onClick={() => router.push("/search")}
            className="w-full flex items-center gap-3 bg-white/15 hover:bg-white/20 border border-white/20 rounded-2xl px-4 py-3.5 text-left transition-all duration-200"
          >
            <Search className="w-4 h-4 text-white/60 shrink-0" />
            <span className="text-white/60 text-sm">Search businesses, categories...</span>
            <SlidersHorizontal className="w-4 h-4 text-white/60 ml-auto shrink-0" />
          </button>

          {/* Location status row */}
          <div className="flex items-center gap-2 mt-3">
            {locationLoading ? (
              <div className="h-2.5 w-2.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
            ) : (
              <MapPin className="w-3 h-3 text-white/50 shrink-0" />
            )}
            <span className="text-white/50 text-xs flex-1">{locationLabel}</span>

            {/* Retry button shown when permission was denied */}
            {denied && (
              <button
                onClick={retryLocation}
                className="flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition-colors"
              >
                <Navigation className="w-3 h-3" />
                Enable location
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Location permission denied banner */}
        {denied && (
          <FadeIn>
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Location access disabled
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Allow location access to see businesses sorted by distance from you.
                </p>
              </div>
              <button
                onClick={retryLocation}
                className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline transition-colors"
              >
                Try again
              </button>
            </div>
          </FadeIn>
        )}

        {/* Categories */}
        <div className="mb-5">
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            loading={catLoading}
          />
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-foreground text-lg">
              {selectedCategory
                ? selectedCategory
                : hasRealLocation
                ? "Near You"
                : "All Businesses"}
            </h2>
            {!isLoading && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {businesses.length} {businesses.length === 1 ? "business" : "businesses"} found
              </p>
            )}
          </div>
          {!isLoading && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          )}
        </div>

        {isLoading ? (
          <BusinessGridSkeleton count={8} />
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <h3 className="font-semibold text-foreground mb-2">No businesses found</h3>
            <p className="text-muted-foreground text-sm mb-5">
              {selectedCategory
                ? `No businesses in "${selectedCategory}" yet`
                : "No businesses available right now"}
            </p>
            {selectedCategory && (
              <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                Clear filter
              </Button>
            )}
          </div>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {businesses.map((b) => (
              <StaggerItem key={b._id}>
                <BusinessCard business={b} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        {/* Loading trigger for infinite scroll */}
        {businesses.length > 0 && hasNextPage && (
          <div ref={ref} className="py-8 flex justify-center">
            {isFetchingNextPage && (
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
