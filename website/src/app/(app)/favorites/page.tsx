"use client";

import { Heart, MapPin } from "lucide-react";
import { useFavoriteBusinesses } from "@/lib/hooks/useDashboard";
import { useToggleFavorite } from "@/lib/hooks/useBusinesses";
import { BusinessCard } from "@/components/app/BusinessCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BusinessGridSkeleton } from "@/components/app/Skeletons";
import { StaggerList, StaggerItem } from "@/components/app/FadeIn";
import { useGuestGuard } from "@/lib/hooks/useGuestGuard";

export default function FavoritesPage() {
  const redirecting = useGuestGuard();
  const { data: favorites, isLoading } = useFavoriteBusinesses();
  const toggleFavorite = useToggleFavorite();

  if (redirecting) return null;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-600 to-pink-700 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Favorites</h1>
              <p className="text-white/70 text-sm">Your saved businesses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <BusinessGridSkeleton count={4} />
        ) : !favorites || favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Save businesses you love to get updates on new offers and announcements
            </p>
            <Link href="/explore">
              <Button className="bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0">
                <MapPin className="w-4 h-4 mr-2" />
                Explore Businesses
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {favorites.length} saved {favorites.length === 1 ? "business" : "businesses"}
            </p>
            <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((b) => (
                <StaggerItem key={b._id}>
                  <div className="relative group">
                    <BusinessCard business={b} />
                    <button
                      onClick={() => toggleFavorite.mutate(b._id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-rose-600"
                      title="Remove from favorites"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                    </button>
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          </>
        )}
      </div>
    </div>
  );
}
