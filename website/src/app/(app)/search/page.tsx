"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal, Loader2 } from "lucide-react";
import { useSearchBusinesses } from "@/lib/hooks/useBusinesses";
import { useCategories } from "@/lib/hooks/useBusinesses";
import { BusinessCard } from "@/components/app/BusinessCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInView } from "react-intersection-observer";
import { BusinessGridSkeleton } from "@/components/app/Skeletons";
import { StaggerList, StaggerItem } from "@/components/app/FadeIn";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: categoriesData } = useCategories();

  // Focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { 
    data, 
    isLoading, 
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSearchBusinesses(
    debouncedQuery.length >= 2
      ? { query: debouncedQuery, category: selectedCategory || undefined }
      : null
  );

  const businesses = data?.pages.flatMap((p) => p.businesses) ?? [];
  const categories = categoriesData ?? [];
  const hasQuery = debouncedQuery.length >= 2;
  const isSearching = isLoading || (isFetching && !isFetchingNextPage);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "400px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-full">
      {/* Sticky search header */}
      <div className="sticky top-0 md:top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto sm:px-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search businesses, categories, locations..."
              className="pl-10 pr-20 h-11 rounded-2xl bg-muted border-0 focus-visible:ring-primary/30"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSearching && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
              {query && (
                <button onClick={() => { setQuery(""); setDebouncedQuery(""); }} className="p-1 hover:text-foreground text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn("p-1.5 rounded-lg transition-colors", showFilters ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category filter chips */}
          {showFilters && categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2.5 no-scrollbar animate-fade-in">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
                  !selectedCategory ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  className={cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
                    selectedCategory === cat.name ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty state — no query */}
        {!hasQuery && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
              <Search className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Search HashView</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Search for restaurants, hotels, spas, shops and more across the UK
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {hasQuery && isSearching && businesses.length === 0 && (
          <BusinessGridSkeleton count={6} />
        )}

        {/* Results */}
        {hasQuery && !isSearching && (
          <>
            {businesses.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {businesses.length} result{businesses.length !== 1 ? "s" : ""} for &quot;{debouncedQuery}&quot;
                </p>
                <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {businesses.map((b) => (
                    <StaggerItem key={b._id}>
                      <BusinessCard business={b} />
                    </StaggerItem>
                  ))}
                </StaggerList>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground text-sm mb-5">
                  No businesses match &quot;{debouncedQuery}&quot;
                  {selectedCategory ? ` in ${selectedCategory}` : ""}
                </p>
                {selectedCategory && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                    Clear category filter
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Loading trigger for infinite scroll */}
        {hasQuery && businesses.length > 0 && hasNextPage && (
          <div ref={ref} className="py-8 flex justify-center">
            {isFetchingNextPage && <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />}
          </div>
        )}
      </div>
    </div>
  );
}
