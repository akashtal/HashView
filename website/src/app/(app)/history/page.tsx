"use client";

import { History, MapPin, Star, Calendar } from "lucide-react";
import { useRewardHistory } from "@/lib/hooks/useDashboard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useGuestGuard } from "@/lib/hooks/useGuestGuard";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export default function HistoryPage() {
  const redirecting = useGuestGuard();
  const { data, isLoading } = useRewardHistory();
  const history = (data as { history?: { _id: string; business?: { name?: string; logo?: { url?: string }; _id?: string }; createdAt: string; points?: number; reviewRating?: number; type?: string }[] })?.history ?? [];

  if (redirecting) return null;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Visit History</h1>
              <p className="text-white/70 text-sm">Your activity and rewards</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
              <History className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No history yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Visit businesses to build your history and earn rewards
            </p>
            <Link href="/explore">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-700 text-white border-0">
                <MapPin className="w-4 h-4 mr-2" />
                Explore Businesses
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((item) => (
              <Link
                key={item._id}
                href={item.business?._id ? `/business/${item.business._id}` : "#"}
                className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.business?.logo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.business.logo.url} alt={item.business.name} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {item.business?.name || "Business Visit"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                    {item.type && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full capitalize">
                        {item.type}
                      </span>
                    )}
                  </div>
                </div>
                {item.reviewRating && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">{item.reviewRating}</span>
                  </div>
                )}
                {item.points && (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-primary">+{item.points}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
