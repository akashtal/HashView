"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Gift, MapPin, RefreshCw, Navigation, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAllBusinesses, useNearbyBusinesses, useCategories } from "@/lib/hooks/useBusinesses";
import { useUserLocation, DEFAULT_LOCATION } from "@/lib/hooks/useUserLocation";
import { BusinessCard } from "@/components/app/BusinessCard";
import { CategoryFilter } from "@/components/app/CategoryFilter";
import { ExploreFilterDrawer, type FilterState, EMPTY_FILTERS, countActiveFilters } from "@/components/app/ExploreFilterDrawer";
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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const activeFilterCount = countActiveFilters(filters);

  // ─── Location ──────────────────────────────────────────────────────────────
  const {
    location: realLocation,
    loading: locationLoading,
    denied,
    hasRealLocation,
    retry: retryLocation,
  } = useUserLocation();

  // Build the params object for the nearby API.
  // While location is still resolving, keep null so the query is disabled.
  const nearbyParams = (() => {
    if (locationLoading) return null;
    const coords = realLocation ?? (denied ? DEFAULT_LOCATION : null);
    if (!coords) return null;

    // Resolve distance radius from filter
    const distanceRadiusMap: Record<string, number> = {
      nearme: 1_000,
      "1km": 1_000,
      "5km": 5_000,
      "10km": 10_000,
      "25km": 25_000,
    };
    const radius = filters.distance
      ? distanceRadiusMap[filters.distance]
      : 20_000_000; // global (show all sorted by distance)

    return {
      ...coords,
      radius,
      category: selectedCategory || undefined,
      ...(filters.ratingSource && filters.minRating
        ? { ratingSource: filters.ratingSource, minRating: filters.minRating }
        : {}),
      ...(filters.distance ? { distance: filters.distance } : {}),
    };
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

  const locationLabel = (() => {
    if (locationLoading) return "Getting your location...";
    if (hasRealLocation) return "Showing businesses near you";
    if (denied) return "Location unavailable — showing all businesses";
    return "Showing all businesses";
  })();

  return (
    <div className="min-h-full">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Hi {firstName} 👋</h1>
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

          {/* Search bar — clicking the filter icon opens the drawer */}
          <div className="relative">
            <button
              onClick={() => router.push("/search")}
              className="w-full flex items-center gap-3 bg-white/15 hover:bg-white/20 border border-white/20 rounded-2xl px-4 py-3.5 text-left transition-all duration-200"
            >
              <Search className="w-4 h-4 text-white/60 shrink-0" />
              <span className="text-white/60 text-sm flex-1">Search businesses, categories...</span>
            </button>

            {/* Filter icon button — separate so it opens drawer, not search */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFilterDrawerOpen(true);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-white/20 transition-colors"
              aria-label="Open filters"
            >
              {/* SlidersHorizontal with active badge */}
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/70"
                >
                  <line x1="21" x2="14" y1="4" y2="4" />
                  <line x1="10" x2="3" y1="4" y2="4" />
                  <line x1="21" x2="12" y1="12" y2="12" />
                  <line x1="8" x2="3" y1="12" y2="12" />
                  <line x1="21" x2="16" y1="20" y2="20" />
                  <line x1="12" x2="3" y1="20" y2="20" />
                  <line x1="14" x2="14" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="10" y2="14" />
                  <line x1="16" x2="16" y1="18" y2="22" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Active filters pill strip */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-white/60 text-xs">Filters:</span>
              {filters.ratingSource && filters.minRating && (
                <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-white text-xs font-semibold">
                  {filters.minRating}+ ⭐ {filters.ratingSource === "hashview" ? "HashView" : filters.ratingSource === "google" ? "Google" : "TripAdvisor"}
                </span>
              )}
              {filters.distance && (
                <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-white text-xs font-semibold">
                  📍 {filters.distance === "nearme" ? "Near Me" : filters.distance.toUpperCase()}
                </span>
              )}
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="text-white/50 hover:text-white text-xs underline transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Location status row */}
          <div className="flex items-center gap-2 mt-3">
            {locationLoading ? (
              <div className="h-2.5 w-2.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
            ) : (
              <MapPin className="w-3 h-3 text-white/50 shrink-0" />
            )}
            <span className="text-white/50 text-xs flex-1">{locationLabel}</span>
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

      {/* ─── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Location denied banner */}
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
                : activeFilterCount > 0
                ? "No businesses match your filters"
                : "No businesses available right now"}
            </p>
            {(selectedCategory || activeFilterCount > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory(null);
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Clear all filters
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

        {/* Infinite scroll trigger */}
        {businesses.length > 0 && hasNextPage && (
          <div ref={ref} className="py-8 flex justify-center">
            {isFetchingNextPage && (
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* ─── Filter drawer ───────────────────────────────────────────────────── */}
      <ExploreFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        hasLocation={hasRealLocation}
        onRequestLocation={() => {
          retryLocation();
          setFilterDrawerOpen(false);
        }}
      />
    </div>
  );
}
