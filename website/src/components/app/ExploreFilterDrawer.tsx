"use client";

/**
 * ExploreFilterDrawer
 * ─────────────────────────────────────────────────────────────────────────────
 * Web equivalent of the mobile UserHomeScreen filter modal.
 * Supports:
 *  - Rating source (HashView / Google / TripAdvisor)
 *  - Min star level (3+ / 4+ / 5+)
 *  - Distance radius (Near Me / 1km / 5km / 10km / 25km) — only when location available
 */

import { useState, useEffect } from "react";
import { X, Star, MapPin, Navigation, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export interface FilterState {
  ratingSource: "hashview" | "google" | "tripadvisor" | null;
  minRating: 3 | 4 | 5 | null;
  distance: "nearme" | "1km" | "5km" | "10km" | "25km" | null;
}

export const EMPTY_FILTERS: FilterState = {
  ratingSource: null,
  minRating: null,
  distance: null,
};

export function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.ratingSource && f.minRating) n++;
  if (f.distance) n++;
  return n;
}

interface ExploreFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

const RATING_SOURCES = [
  { key: "hashview" as const, label: "HashView", color: "bg-violet-600 border-violet-600", textColor: "text-white" },
  { key: "google" as const, label: "Google", color: "bg-blue-500 border-blue-500", textColor: "text-white" },
  { key: "tripadvisor" as const, label: "TripAdvisor", color: "bg-emerald-600 border-emerald-600", textColor: "text-white" },
];

const STAR_LEVELS = [5, 4, 3] as const;

const DISTANCE_OPTIONS: { key: FilterState["distance"] & string; label: string }[] = [
  { key: "nearme", label: "Near Me" },
  { key: "1km", label: "1 km" },
  { key: "5km", label: "5 km" },
  { key: "10km", label: "10 km" },
  { key: "25km", label: "25 km" },
];

export function ExploreFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  hasLocation,
  onRequestLocation,
}: ExploreFilterDrawerProps) {
  // Local draft — applied only when user clicks "Apply"
  const [draft, setDraft] = useState<FilterState>(filters);

  // Sync draft with incoming filters when drawer opens
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const setSource = (src: FilterState["ratingSource"]) => {
    setDraft((d) => ({
      ...d,
      ratingSource: d.ratingSource === src ? null : src,
      minRating: null, // reset stars when source changes
    }));
  };

  const setStars = (stars: 3 | 4 | 5) => {
    setDraft((d) => ({ ...d, minRating: d.minRating === stars ? null : stars }));
  };

  const setDistance = (dist: FilterState["distance"]) => {
    setDraft((d) => ({ ...d, distance: d.distance === dist ? null : dist }));
  };

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer — slides up from bottom on mobile, right panel on md+ */}
          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col md:bottom-auto md:top-0 md:right-0 md:left-auto md:w-[400px] md:h-full md:rounded-none md:rounded-l-3xl"
            style={{ transform: undefined }} // let framer-motion handle
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">Filters</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-7">

              {/* ── Rating source ──────────────────────────────────── */}
              <section>
                <h3 className="text-base font-bold text-foreground mb-1">Filter by Rating</h3>
                <p className="text-xs text-muted-foreground mb-3">Step 1: Select rating source</p>
                <div className="flex flex-wrap gap-2">
                  {RATING_SOURCES.map(({ key, label, color }) => {
                    const active = draft.ratingSource === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSource(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                          active
                            ? `${color} text-white`
                            : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {key === "hashview" && <Star className="w-4 h-4" />}
                        {key === "google" && (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                        {key === "tripadvisor" && (
                          <span className="text-base leading-none">🦉</span>
                        )}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Star level — shown when source is selected */}
                {draft.ratingSource && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-3">Step 2: Select minimum stars</p>
                    <div className="flex flex-wrap gap-2">
                      {STAR_LEVELS.map((stars) => {
                        const active = draft.minRating === stars;
                        return (
                          <button
                            key={stars}
                            onClick={() => setStars(stars)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                              active
                                ? "bg-amber-400 border-amber-400 text-gray-900"
                                : "bg-muted border-border text-muted-foreground hover:border-amber-400/50"
                            }`}
                          >
                            {Array.from({ length: stars }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${active ? "fill-gray-900 text-gray-900" : "fill-muted-foreground text-muted-foreground"}`} />
                            ))}
                            <span>{stars}+ Stars</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Distance ───────────────────────────────────────── */}
              <section>
                <h3 className="text-base font-bold text-foreground mb-3">Filter by Distance</h3>
                {hasLocation ? (
                  <div className="flex flex-wrap gap-2">
                    {DISTANCE_OPTIONS.map(({ key, label }) => {
                      const active = draft.distance === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setDistance(key)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                            active
                              ? key === "nearme"
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-blue-500 border-blue-500 text-white"
                              : "bg-muted border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {key === "nearme" ? (
                            <Navigation className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    onClick={onRequestLocation}
                    className="w-full flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800/50 rounded-xl p-4 text-left hover:border-blue-400 transition-colors"
                  >
                    <MapPin className="w-6 h-6 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Enable Location Access</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        Get distance-based filters and nearby businesses
                      </p>
                    </div>
                  </button>
                )}
              </section>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={handleClear}
                className="flex-1 py-3 rounded-xl border-2 border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
