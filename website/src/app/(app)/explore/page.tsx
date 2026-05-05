"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Bell, Gift, MapPin, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAllBusinesses, useNearbyBusinesses, useCategories } from "@/lib/hooks/useBusinesses";
import { BusinessCard } from "@/components/app/BusinessCard";
import { CategoryFilter } from "@/components/app/CategoryFilter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { BusinessGridSkeleton } from "@/components/app/Skeletons";
import { StaggerList, StaggerItem, FadeIn } from "@/components/app/FadeIn";

const DEFAULT_LOCATION = { latitude: 51.5283, longitude: -0.1005 }; // London fallback

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: categoriesData, isLoading: catLoading } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // Try to get user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationDenied(true);
          setLocationLoading(false);
        },
        { timeout: 4000 }
      );
    } else {
      setLocationDenied(true);
    }
  }, []);

  // Nearby businesses (preferred when location available)
  const nearbyParams = userLocation
    ? { ...userLocation, radius: 20_000_000, category: selectedCategory || undefined }
    : locationDenied
    ? { ...DEFAULT_LOCATION, radius: 20_000_000, category: selectedCategory || undefined }
    : null;

  const {
    data: nearbyData,
    isLoading: nearbyLoading,
    refetch: refetchNearby,
    fetchNextPage: fetchNextNearby,
    hasNextPage: hasNextNearby,
    isFetchingNextPage: isFetchingNextNearby,
  } = useNearbyBusinesses(nearbyParams);

  // All businesses fallback
  const { 
    data: allData, 
    isLoading: allLoading,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingNextAll,
  } = useAllBusinesses(
    selectedCategory ? { category: selectedCategory } : undefined,
    { enabled: nearbyParams === null }
  );

  const businesses = nearbyParams
    ? nearbyData?.pages.flatMap((p) => p.businesses) ?? []
    : allData?.pages.flatMap((p) => p.businesses) ?? [];

  const hasNextPage = nearbyParams ? hasNextNearby : hasNextAll;
  const isFetchingNextPage = nearbyParams ? isFetchingNextNearby : isFetchingNextAll;
  const fetchNextPage = nearbyParams ? fetchNextNearby : fetchNextAll;

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "400px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isLoading = nearbyLoading || allLoading;

  const firstName = user?.name?.split(" ")[0] || "there";
  const categories = categoriesData ?? [];

  const handleRefresh = useCallback(() => {
    refetchNearby();
  }, [refetchNearby]);

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
              <Link href="/notifications" className="relative w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                <Bell className="w-4.5 h-4.5 text-white" />
              </Link>
              <Link href="/coupons" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                <Gift className="w-4.5 h-4.5 text-white" />
              </Link>
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

          {/* Location indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            <MapPin className="w-3 h-3 text-white/50" />
            <span className="text-white/50 text-xs">
              {locationLoading
                ? "Getting your location..."
                : userLocation
                ? "Showing businesses near you"
                : "Showing all businesses"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {selectedCategory ? selectedCategory : userLocation ? "Near You" : "All Businesses"}
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
            {isFetchingNextPage && <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />}
          </div>
        )}
      </div>
    </div>
  );
}
