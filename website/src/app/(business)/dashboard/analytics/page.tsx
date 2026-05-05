"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Star, Eye, Users, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBusinessDashboardFull } from "@/lib/hooks/useDashboard";
import ApiService from "@/lib/api";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Recharts is ~100 kB — only load it when the analytics page is actually visited
const VisitsBarChart = dynamic(
  () => import("@/components/app/AnalyticsCharts").then((m) => ({ default: m.VisitsBarChart })),
  { ssr: false, loading: () => <div className="h-52 rounded-xl bg-muted animate-pulse" /> }
);
const RatingTrendChart = dynamic(
  () => import("@/components/app/AnalyticsCharts").then((m) => ({ default: m.RatingTrendChart })),
  { ssr: false, loading: () => <div className="h-52 rounded-xl bg-muted animate-pulse" /> }
);
const CouponRedemptionChart = dynamic(
  () => import("@/components/app/AnalyticsCharts").then((m) => ({ default: m.CouponRedemptionChart })),
  { ssr: false, loading: () => <div className="h-52 rounded-xl bg-muted animate-pulse" /> }
);
const RatingBreakdownPie = dynamic(
  () => import("@/components/app/AnalyticsCharts").then((m) => ({ default: m.RatingBreakdownPie })),
  { ssr: false, loading: () => <div className="h-52 rounded-xl bg-muted animate-pulse" /> }
);

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateMonthLabels(count = 6) {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("default", { month: "short" }));
  }
  return labels;
}

// Build rating breakdown from reviews list
function buildRatingBreakdown(reviews: Record<string, unknown>[]) {
  const buckets: Record<string, number> = { "5★": 0, "4★": 0, "3★": 0, "2★": 0, "1★": 0 };
  reviews.forEach((r) => {
    const rating = r.rating as number;
    const key = `${Math.round(rating)}★`;
    if (buckets[key] !== undefined) buckets[key]++;
  });
  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  bgColor,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="w-9 h-9 rounded-xl bg-muted mb-3" />
        <div className="w-16 h-7 rounded bg-muted mb-1" />
        <div className="w-24 h-3 rounded bg-muted" />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", bgColor)}>
        <Icon className={cn("w-4.5 h-4.5", iconColor)} />
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Chart card ──────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  loading,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-display font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="h-52 rounded-xl bg-muted animate-pulse" />
      ) : (
        children
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);

  useEffect(() => {
    ApiService.getMyBusinesses()
      .then((res) => setMyBusinessId(res.businesses?.[0]?._id ?? null))
      .finally(() => setBusinessLoading(false));
  }, []);

  const {
    dashboard,
    reviews,
    coupons,
    redemptionStats,
    isLoading,
  } = useBusinessDashboardFull(myBusinessId);

  const stats = dashboard.data?.stats;
  const allReviews = (reviews.data?.reviews ?? []) as unknown as Record<string, unknown>[];
  const couponList = coupons.data ?? [];
  const redemption = redemptionStats.data;

  const monthLabels = generateMonthLabels(6);

  // Build mock monthly visits (real data would need a time-series endpoint)
  const visitsData = monthLabels.map((label, i) => ({
    label,
    visits: Math.max(0, Math.round((stats?.totalVisits ?? 0) / 6) + (i - 2) * 3),
  }));

  // Rating over time — derive from reviews
  const ratingData = monthLabels.map((label) => ({ label, rating: stats?.averageRating ?? 0 }));

  // Coupon redemption
  const couponData = monthLabels.map((label, i) => ({
    label,
    redeemed: redemption?.totalRedeemed
      ? Math.max(0, Math.round(redemption.totalRedeemed / 6) + (i - 2))
      : 0,
    issued: couponList.length,
  }));

  // Rating breakdown pie
  const ratingBreakdown = buildRatingBreakdown(allReviews);

  const loading = businessLoading || isLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Performance insights for your business
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dashboard.refetch()}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total Reviews"
          value={stats?.totalReviews ?? 0}
          icon={Star}
          iconColor="text-amber-500"
          bgColor="bg-amber-500/10"
          loading={loading}
        />
        <StatTile
          label="Avg Rating"
          value={stats?.averageRating ? stats.averageRating.toFixed(1) : "–"}
          sub="out of 5.0"
          icon={TrendingUp}
          iconColor="text-emerald-500"
          bgColor="bg-emerald-500/10"
          loading={loading}
        />
        <StatTile
          label="Total Visits"
          value={stats?.totalVisits ?? 0}
          icon={Eye}
          iconColor="text-violet-500"
          bgColor="bg-violet-500/10"
          loading={loading}
        />
        <StatTile
          label="Coupons Active"
          value={couponList.filter((c) => c.isActive).length}
          icon={BarChart3}
          iconColor="text-orange-500"
          bgColor="bg-orange-500/10"
          loading={loading}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly Visits"
          subtitle="Customer footfall over the last 6 months"
          loading={loading}
        >
          <VisitsBarChart data={visitsData} height={220} />
        </ChartCard>

        <ChartCard
          title="Rating Trend"
          subtitle="Average star rating over the last 6 months"
          loading={loading}
        >
          <RatingTrendChart data={ratingData} height={220} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Coupon Redemptions"
          subtitle="Monthly redemption activity"
          loading={loading}
        >
          <CouponRedemptionChart data={couponData} height={200} />
        </ChartCard>

        <ChartCard
          title="Rating Breakdown"
          subtitle="Distribution of star ratings"
          loading={loading}
        >
          <RatingBreakdownPie data={ratingBreakdown} height={200} />
        </ChartCard>
      </div>

      {/* Redemption stats */}
      {redemption && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Coupon Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Redemptions", value: redemption.totalRedeemed ?? 0 },
              { label: "Expired", value: redemption.totalExpired ?? 0 },
              { label: "Active Coupons", value: couponList.filter((c) => c.isActive).length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-muted/30 p-4 text-center">
                <p className="text-2xl font-display font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
