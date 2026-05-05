"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Users,
  Eye,
  Ticket,
  Megaphone,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  BadgeCheck,
  Crown,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBusinessDashboardFull } from "@/lib/hooks/useDashboard";
import dynamic from "next/dynamic";
const DownloadAppModal = dynamic(
  () => import("@/components/app/DownloadAppModal").then((m) => ({ default: m.DownloadAppModal })),
  { ssr: false }
);
import type { FeatureGateKey } from "@/lib/feature-gates";
import ApiService from "@/lib/api";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  trend?: string;
  loading?: boolean;
}

function KPICard({ label, value, icon: Icon, iconColor, bgColor, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="w-16 h-3 rounded bg-muted" />
        </div>
        <div className="w-20 h-7 rounded bg-muted mb-1" />
        <div className="w-24 h-3 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// ─── KYC Status Banner ────────────────────────────────────────────────────────

function KYCStatusBanner({ status }: { status: Business["kycStatus"] }) {
  const configs = {
    pending: {
      icon: Clock,
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      message: "Your business is pending review. We'll notify you once verified.",
    },
    in_review: {
      icon: RefreshCw,
      bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-400",
      message: "Your documents are being reviewed by our team.",
    },
    verified: {
      icon: CheckCircle2,
      bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      message: "Your business is verified! Customers can discover you.",
    },
    approved: {
      icon: CheckCircle2,
      bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      message: "Your business is verified! Customers can discover you.",
    },
    rejected: {
      icon: XCircle,
      bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      message: "Your business registration was rejected. Please contact support.",
    },
  };

  const cfg = configs[status] ?? configs.pending;
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-4", cfg.bg)}>
      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", cfg.text)} />
      <div>
        <p className={cn("text-sm font-semibold capitalize", cfg.text)}>
          {status.replace("_", " ")}
        </p>
        <p className={cn("text-xs mt-0.5 opacity-80", cfg.text)}>{cfg.message}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isPro } = useAuth();
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [myBusiness, setMyBusiness] = useState<Business | null>(null);
  const [gateFeature, setGateFeature] = useState<FeatureGateKey | null>(null);

  // Fetch the business owner's businesses (may have multiple but we show primary)
  useEffect(() => {
    ApiService.getMyBusinesses()
      .then((res) => {
        const biz = res.businesses?.[0] ?? null;
        setMyBusiness(biz);
        setMyBusinessId(biz?._id ?? null);
      })
      .catch(() => setBusinessError("Failed to load your business data."))
      .finally(() => setBusinessLoading(false));
  }, []);

  const { dashboard, reviews, coupons, isLoading: dashLoading } = useBusinessDashboardFull(myBusinessId);

  const isLoading = businessLoading || dashLoading;
  const stats = dashboard.data?.stats;
  const recentReviews = (reviews.data?.reviews ?? []).slice(0, 3);
  const recentUpdates = (dashboard.data?.recentUpdates ?? []).slice(0, 3);
  const activeCoupons = (coupons.data ?? []).filter((c) => c.isActive);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <DownloadAppModal feature={gateFeature} onClose={() => setGateFeature(null)} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {myBusiness?.name ?? "Your Business"} · Dashboard overview
        </p>
      </div>

      {/* ── No business registered ── */}
      {!businessLoading && !myBusiness && !businessError && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BadgeCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">
            Register Your Business
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm mb-5">
            Get your business on HashView and start attracting local customers.
          </p>
          <Button onClick={() => router.push("/register-business")}>
            Get Started — It&apos;s Free
          </Button>
        </div>
      )}

      {/* ── Error ── */}
      {businessError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{businessError}</p>
        </div>
      )}

      {myBusiness && (
        <>
          {/* ── KYC Banner ── */}
          <KYCStatusBanner status={myBusiness.kycStatus} />

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Reviews"
              value={stats?.totalReviews ?? 0}
              icon={Star}
              iconColor="text-amber-500"
              bgColor="bg-amber-500/10"
              loading={isLoading}
            />
            <KPICard
              label="Average Rating"
              value={stats?.averageRating ? stats.averageRating.toFixed(1) : "–"}
              icon={TrendingUp}
              iconColor="text-emerald-500"
              bgColor="bg-emerald-500/10"
              loading={isLoading}
            />
            <KPICard
              label="Total Visits"
              value={stats?.totalVisits ?? 0}
              icon={Eye}
              iconColor="text-violet-500"
              bgColor="bg-violet-500/10"
              loading={isLoading}
            />
            <KPICard
              label="Active Coupons"
              value={isLoading ? "–" : activeCoupons.length}
              icon={Ticket}
              iconColor="text-orange-500"
              bgColor="bg-orange-500/10"
              loading={isLoading}
            />
          </div>

          {/* ── Quick actions ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Scan QR", icon: QrCode, action: () => setGateFeature("BUSINESS_QR_SCAN"), color: "from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800" },
                { label: "Create Coupon", icon: Ticket, href: "/dashboard/coupons", color: "from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-800" },
                { label: "Post Update", icon: Megaphone, href: "/dashboard/updates", color: "from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-800" },
                { label: "View Reviews", icon: Star, href: "/dashboard/reviews", color: "from-amber-500/10 to-yellow-500/10 border-amber-200 dark:border-amber-800" },
                { label: "Analytics", icon: TrendingUp, href: "/dashboard/analytics", color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-800" },
              ].map(({ label, icon: Icon, href, action, color }) => {
                const inner = (
                  <>
                    <Icon className="w-4 h-4 text-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </>
                );
                
                const className = cn(
                  "flex items-center gap-2.5 rounded-xl border bg-gradient-to-br px-4 py-3 hover:opacity-80 transition-opacity text-left",
                  color
                );

                return href ? (
                  <Link key={label} href={href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <button key={label} onClick={action} className={className}>
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Recent reviews + Recent updates ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent reviews */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-foreground">Recent Reviews</h2>
                <Link href="/dashboard/reviews" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentReviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReviews.map((review) => {
                    const r = review as unknown as Record<string, unknown>;
                    const reviewer = r.user as Record<string, unknown> | undefined;
                    const name = (reviewer?.name as string) ?? "Anonymous";
                    const rating = (r.rating as number) ?? 0;
                    const comment = (r.comment as string) ?? "";
                    const date = r.createdAt ? new Date(r.createdAt as string).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
                    return (
                      <div key={r._id as string} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{name}</p>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("w-3 h-3", i < rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{comment || "No comment"}</p>
                          {date && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent updates */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-foreground">Recent Updates</h2>
                <Link href="/dashboard/updates" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-xl bg-muted h-14" />
                  ))}
                </div>
              ) : recentUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No updates posted yet</p>
                  <Link href="/dashboard/updates">
                    <Button variant="outline" size="sm" className="mt-3">
                      Post First Update
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentUpdates.map((update) => {
                    const typeColor =
                      update.type === "offer"
                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        : update.type === "announcement"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-violet-500/10 text-violet-600 dark:text-violet-400";
                    const date = new Date(update.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    return (
                      <div key={update._id} className="flex items-start gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
                        <span className={cn("text-[10px] font-bold uppercase rounded-full px-2 py-0.5 shrink-0 mt-0.5", typeColor)}>
                          {update.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{update.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
                        </div>
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", update.isActive ? "bg-emerald-500" : "bg-muted-foreground")} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Pro upsell ── */}
          {!isPro && (
            <div className="rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-violet-900" />
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/30 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-violet-400/30 blur-2xl" />
              </div>
              <div className="relative flex items-center justify-between p-6 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 text-sm font-bold uppercase tracking-wide">Pro Plan</span>
                  </div>
                  <h3 className="text-white font-display font-bold text-lg mb-1">
                    Unlock your full potential
                  </h3>
                  <p className="text-white/70 text-sm max-w-xs">
                    Unlimited updates, priority listing, advanced analytics and more.
                  </p>
                </div>
                <Link href="/dashboard/settings" className="shrink-0">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg">
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
