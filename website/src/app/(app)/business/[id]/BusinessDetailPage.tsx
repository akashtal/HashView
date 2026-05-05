"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Star, MapPin, Heart, Share2, Clock, Globe,
  ShieldCheck, Flag, ExternalLink, Loader2, MessageSquarePlus,
  QrCode, Tag
} from "lucide-react";
import { useBusiness } from "@/lib/hooks/useBusinesses";
import { useBusinessReviews } from "@/lib/hooks/useReviews";
import { useBusinessUpdates } from "@/lib/hooks/useBusinesses";
import { useToggleFavorite } from "@/lib/hooks/useBusinesses";
import { ReviewCard } from "@/components/app/ReviewCard";
import { RatingDisplay } from "@/components/app/RatingDisplay";
import { DownloadAppBanner } from "@/components/app/DownloadAppBanner";
import dynamic from "next/dynamic";
const DownloadAppModal = dynamic(
  () => import("@/components/app/DownloadAppModal").then((m) => ({ default: m.DownloadAppModal })),
  { ssr: false }
);
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { FeatureGateKey } from "@/lib/feature-gates";
import ApiService from "@/lib/api";
import type { Review } from "@/lib/types";
import { PageTransition, FadeIn } from "@/components/app/FadeIn";
import { LocalBusinessJsonLd } from "@/components/app/LocalBusinessJsonLd";

const TABS = [
  { key: "reviews", label: "Reviews" },
  { key: "updates", label: "Updates & Offers" },
  { key: "about", label: "About" },
] as const;
type Tab = typeof TABS[number]["key"];

const CATEGORY_KEYS = [
  { key: "staff" as const, label: "Staff" },
  { key: "facilities" as const, label: "Facilities" },
  { key: "cleanliness" as const, label: "Cleanliness" },
  { key: "comfort" as const, label: "Comfort" },
  { key: "valueForMoney" as const, label: "Value" },
  { key: "location" as const, label: "Location" },
];

function computeCategoryAverages(reviews: Review[]) {
  const keys = CATEGORY_KEYS.map((c) => c.key);
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  keys.forEach((k) => { sums[k] = 0; counts[k] = 0; });
  reviews.forEach((r) => {
    if (r.categoryRatings) {
      keys.forEach((k) => {
        const val = r.categoryRatings![k];
        if (val) { sums[k] += val; counts[k]++; }
      });
    }
  });
  const avgs: Record<string, number | null> = {};
  keys.forEach((k) => { avgs[k] = counts[k] > 0 ? sums[k] / counts[k] : null; });
  return avgs;
}

function getRatingLabel(avg: number): string {
  if (avg >= 4.5) return "Exceptional";
  if (avg >= 4) return "Very good";
  if (avg >= 3.5) return "Good";
  return "Reviews";
}

export default function BusinessDetailPage(_props?: { params?: Promise<{ id: string }> }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("reviews");
  const [isFavorite, setIsFavorite] = useState(false);
  const [gateFeature, setGateFeature] = useState<FeatureGateKey | null>(null);

  const toggleFav = useToggleFavorite();
  const { data: business, isLoading } = useBusiness(id);
  const { data: reviewsData } = useBusinessReviews(id);
  const { data: updates } = useBusinessUpdates(id);

  const reviews = reviewsData?.reviews ?? [];
  const categoryAvgs = computeCategoryAverages(reviews);
  const availableCats = CATEGORY_KEYS.filter((c) => categoryAvgs[c.key] !== null);

  // Track visit
  useEffect(() => {
    if (id) ApiService.trackBusinessVisit(id).catch(() => {});
  }, [id]);

  // Sync favorite state
  useEffect(() => {
    if (user && business) {
      const favs = (user as { favoritePlaces?: (string | { _id: string })[] }).favoritePlaces ?? [];
      setIsFavorite(favs.some((f) => (typeof f === "string" ? f : f._id) === business._id));
    }
  }, [user, business]);

  const handleToggleFavorite = () => {
    if (!business) return;
    setIsFavorite((v) => !v);
    toggleFav.mutate(business._id);
  };

  const handleShare = async () => {
    if (!business) return;
    try {
      await navigator.share?.({
        title: business.name,
        text: `Check out ${business.name} on HashView!`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isVerified = !!business.owner || business.claimRequest?.status === "approved";
  const isPending = business.claimRequest?.status === "pending";
  const googleProfile = business.externalProfiles?.googleBusiness;
  const tripAdvisorProfile = business.externalProfiles?.tripAdvisor;
  const overallScore = business.rating?.average
    ? (business.rating.average * 2).toFixed(1)
    : null;

  return (
    <PageTransition>
      {/* JSON-LD Structured Data */}
      {business && (
        <LocalBusinessJsonLd
          name={business.name}
          description={business.description}
          url={`https://hashview.co.uk/business/${business._id}`}
          address={business.address}
          image={business.coverImage?.url || business.logo?.url}
          rating={business.rating?.average && business.rating?.count
            ? { average: business.rating.average, count: business.rating.count }
            : undefined
          }
          openingHours={business.openingHours as Parameters<typeof LocalBusinessJsonLd>[0]['openingHours']}
          category={business.category}
        />
      )}
      <DownloadAppModal feature={gateFeature} onClose={() => setGateFeature(null)} />

      <div className="min-h-full pb-10">
        {/* Hero */}
        <div className="relative h-72 md:h-96 bg-gradient-to-br from-violet-900 to-purple-800 overflow-hidden">
          {business.coverImage?.url ? (
            <Image
              src={business.coverImage.url}
              alt={business.name}
              fill
              className="object-cover"
              priority
              unoptimized={business.coverImage.url.includes('googleusercontent.com')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-20">🏢</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Back + action buttons */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-900" />
              </button>
              <button
                onClick={handleToggleFavorite}
                className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              >
                <Heart className={cn("w-4 h-4", isFavorite ? "fill-red-500 text-red-500" : "text-gray-900")} />
              </button>
            </div>
          </div>

          {/* Gallery thumbnails */}
          {business.images && business.images.length > 0 && (
            <div className="absolute bottom-4 left-0 right-0 flex gap-2 px-4 overflow-x-auto no-scrollbar">
              {business.images.slice(0, 5).map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-md">
                  <Image src={img.url} alt="" fill className="object-cover" unoptimized={img.url.includes('googleusercontent.com')} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Container (2-Column on Desktop) */}
        <FadeIn direction="up" delay={0.1} className="max-w-6xl mx-auto px-0 sm:px-6 lg:px-8 lg:-mt-24 relative z-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 items-start">
          
          {/* Left Column: Info, Tabs, Content */}
          <div className="bg-card -mt-6 sm:mt-0 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden">
            {/* Business Info Card */}
            <div className="px-5 pt-6 pb-5 relative">
          {/* Logo + Name + Rating */}
          <div className="flex items-start gap-4 mb-4">
            {business.logo?.url && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-border shadow shrink-0">
                <Image src={business.logo.url} alt={business.name} width={64} height={64} className="object-cover" unoptimized={business.logo.url.includes('googleusercontent.com')} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-display font-bold text-foreground mb-1 leading-tight">{business.name}</h1>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{business.address?.city || business.address?.area || "Location"}</span>
              </div>
            </div>
            {overallScore && (
              <div className="shrink-0 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center shadow">
                  <span className="text-white font-black text-base">{overallScore}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{business.rating?.count} reviews</p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 text-orange-600 dark:text-orange-400 text-xs font-semibold capitalize">
              {business.category}
            </span>
            {isVerified ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400 text-xs font-bold">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            ) : isPending ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Clock className="w-3 h-3" /> Claim Pending
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <Flag className="w-3 h-3" /> Unclaimed
              </span>
            )}
          </div>

          {/* External links */}
          {(googleProfile?.rating || tripAdvisorProfile?.profileUrl) && (
            <div className="flex gap-2 mb-4">
              {googleProfile?.rating && (
                <a
                  href={`https://search.google.com/local/reviews?placeid=${googleProfile.placeId || ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Google</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-foreground">{Number(googleProfile.rating).toFixed(1)}</span>
                  </div>
                  {googleProfile.reviewCount && (
                    <span className="text-[10px] text-muted-foreground">({Number(googleProfile.reviewCount).toLocaleString()})</span>
                  )}
                </a>
              )}
              {tripAdvisorProfile?.profileUrl && (
                <a
                  href={tripAdvisorProfile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 rounded-xl px-3 py-2"
                >
                  <span className="text-xs font-bold text-green-700 dark:text-green-400">TripAdvisor</span>
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </a>
              )}
            </div>
          )}

          {/* Write review CTA → gated */}
          <button
            onClick={() => setGateFeature("SUBMIT_REVIEW")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/15 transition-colors mb-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Write a Review (App only)
          </button>
        </div>

        {/* Tab nav */}
        <div className="bg-card border-b border-border sticky top-16 z-20">
          <div className="flex overflow-x-auto no-scrollbar px-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "shrink-0 py-4 px-4 border-b-2 text-sm font-semibold transition-all duration-200",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.key === "updates" && (updates?.length ?? 0) > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                    {updates!.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 sm:px-6 py-6">
          {/* Reviews tab */}
          {activeTab === "reviews" && (
            <div>
              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-5xl mb-4">💬</div>
                  <h3 className="font-semibold text-foreground mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground text-sm mb-5">Be the first to share your experience!</p>
                  <button
                    onClick={() => setGateFeature("SUBMIT_REVIEW")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Star className="w-4 h-4" /> Write a Review
                  </button>
                </div>
              ) : (
                <>
                  {/* Overall score */}
                  <div className="flex items-center gap-3 mb-5">
                    {overallScore && (
                      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shrink-0">
                        <span className="text-white text-xl font-black">{overallScore}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-black text-foreground text-base">
                        {business.rating?.average ? getRatingLabel(business.rating.average) : "Reviews"}
                      </p>
                      <p className="text-sm text-muted-foreground">{business.rating?.count || reviews.length} reviews</p>
                    </div>
                  </div>

                  {/* Category breakdowns */}
                  {availableCats.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {availableCats.map(({ key, label }) => {
                        const val = categoryAvgs[key]!;
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-foreground">{label}</span>
                              <span className="font-bold text-foreground">{val.toFixed(1)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${(val / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="h-px bg-border mt-4" />
                    </div>
                  )}

                  {/* Review cards */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black text-foreground">All Reviews</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-0 divide-y divide-border">
                    {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
                  </div>
                </>
              )}

              {/* Download App CTA for reviews */}
              <div className="mt-6">
                <DownloadAppBanner feature="SUBMIT_REVIEW" />
              </div>
            </div>
          )}

          {/* Updates & Offers tab */}
          {activeTab === "updates" && (
            <div>
              {!updates || updates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-5xl mb-4">📢</div>
                  <h3 className="font-semibold text-foreground mb-2">No updates yet</h3>
                  <p className="text-muted-foreground text-sm">This business hasn&apos;t posted any updates or offers yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div key={update._id} className="rounded-2xl border border-border bg-card p-4">
                      {update.image?.url && (
                        <div className="relative h-48 rounded-xl overflow-hidden mb-3">
                          <Image src={update.image.url} alt={update.title} fill className="object-cover" unoptimized={update.image.url.includes('googleusercontent.com')} />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                            update.type === "offer" ? "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" :
                            update.type === "announcement" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {update.type}
                          </span>
                          <h3 className="font-bold text-foreground text-base mt-1">{update.title}</h3>
                        </div>
                        {update.type === "offer" && (
                          <button
                            onClick={() => setGateFeature("CLAIM_OFFER")}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors"
                          >
                            <Tag className="w-3 h-3" /> Claim
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{update.description}</p>
                      {update.validUntil && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Valid until {new Date(update.validUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* About tab (Mobile Only, or default view) */}
          {activeTab === "about" && (
            <div className="space-y-4 lg:hidden">
              {business.description && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="font-bold text-foreground mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{business.description}</p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Address
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {business.address?.fullAddress || "Address not available"}
                </p>
                {business.address?.city && (
                  <p className="text-sm text-muted-foreground">{business.address.city}</p>
                )}
              </div>

              {business.openingHours && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Opening Hours
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(business.openingHours).map(([day, hours]) => {
                      if (!hours) return null;
                      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                      return (
                        <div key={day} className="flex items-center justify-between text-sm">
                          <span className="text-foreground font-medium w-24">{dayName}</span>
                          <span className="text-muted-foreground">
                            {hours.closed ? "Closed" : `${hours.open} – ${hours.close}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {business.socialMedia?.website && (
                <a
                  href={business.socialMedia.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                >
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary truncate">{business.socialMedia.website}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
                </a>
              )}

              {/* Coupon / QR gated CTAs */}
              <div className="space-y-3">
                <button
                  onClick={() => setGateFeature("REDEEM_COUPON")}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground text-sm">Redeem Coupon</p>
                    <p className="text-xs text-muted-foreground">Download the app to scan QR codes</p>
                  </div>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Right Column: Sticky Sidebar (Desktop Only) */}
        <div className="hidden lg:block sticky top-24 space-y-6">
          <div className="bg-card rounded-3xl shadow-xl p-6 border border-border">
            <h3 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Location & Contact
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-1">
              {business.address?.fullAddress || "Address not available"}
            </p>
            {business.address?.city && (
              <p className="text-sm text-muted-foreground mb-4">{business.address.city}</p>
            )}

            {business.socialMedia?.website && (
              <a
                href={business.socialMedia.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4 hover:border-primary/50 transition-colors mb-4"
              >
                <Globe className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary truncate">{business.socialMedia.website}</span>
              </a>
            )}

            {/* CTAs */}
            <div className="space-y-3">
              <button
                onClick={() => setGateFeature("REDEEM_COUPON")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground text-sm">Redeem Coupon</p>
                  <p className="text-xs text-muted-foreground">Download app to scan</p>
                </div>
              </button>
            </div>
          </div>

          {business.openingHours && (
            <div className="bg-card rounded-3xl shadow-xl p-6 border border-border">
              <h3 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Opening Hours
              </h3>
              <div className="space-y-2">
                {Object.entries(business.openingHours).map(([day, hours]) => {
                  if (!hours) return null;
                  const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                  return (
                    <div key={day} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-foreground font-medium">{dayName}</span>
                      <span className="text-muted-foreground font-mono">
                        {hours.closed ? "Closed" : `${hours.open} – ${hours.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
