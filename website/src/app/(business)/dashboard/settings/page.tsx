"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Crown,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
  BarChart3,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ApiService from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Plan feature list ────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: Megaphone, text: "Unlimited business updates & offers" },
  { icon: BarChart3, text: "Advanced analytics & insights" },
  { icon: Zap, text: "Priority search ranking" },
  { icon: ShieldCheck, text: "Verified Pro badge" },
  { icon: Crown, text: "Premium customer support" },
];

const PLANS = [
  { type: "monthly" as const, label: "Monthly", price: "£9.99", period: "/month", save: null },
  { type: "6month" as const, label: "6 Months", price: "£49.99", period: "/6 months", save: "Save 17%" },
  { type: "yearly" as const, label: "Yearly", price: "£89.99", period: "/year", save: "Save 25%" },
];

export default function SettingsPage() {
  const { isPro, subscription, hasFreeTrial, freeTrial, refreshSubscription } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "6month" | "yearly">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await ApiService.createSubscriptionCheckout(selectedPlan);
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await ApiService.createSubscriptionPortal();
      window.open(res.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  };

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your subscription and billing</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Current subscription status ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold text-foreground mb-4">Current Plan</h2>

        {isPro ? (
          <div className="space-y-4">
            {/* Pro badge */}
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200 dark:border-orange-800 px-4 py-3">
              <Crown className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-orange-600 dark:text-orange-400">Pro Plan — Active</p>
                {periodEnd && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {subscription?.cancelAtPeriodEnd
                      ? `Cancels on ${periodEnd}`
                      : `Renews on ${periodEnd}`}
                  </p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 ml-auto" />
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-foreground">
                  <Icon className="w-4 h-4 text-orange-500 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            {/* Manage billing */}
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full sm:w-auto"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Manage Billing
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Free tier indicator */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border px-4 py-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Free Plan</p>
                {hasFreeTrial && freeTrial && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {freeTrial.remaining} of {freeTrial.maxFreeUpdates} free updates remaining
                  </p>
                )}
              </div>
            </div>

            {/* Free plan limits */}
            {hasFreeTrial && freeTrial && (
              <div className="rounded-xl bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Free updates used</span>
                  <span className="font-medium text-foreground">
                    {freeTrial.updatesUsed}/{freeTrial.maxFreeUpdates}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-500 transition-all"
                    style={{
                      width: `${(freeTrial.updatesUsed / freeTrial.maxFreeUpdates) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Upgrade section (only if not pro) ── */}
      {!isPro && (
        <div className="rounded-2xl overflow-hidden border border-violet-200 dark:border-violet-800">
          {/* Hero */}
          <div className="relative bg-gradient-to-br from-violet-900 via-purple-800 to-violet-900 p-6">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 text-sm font-bold uppercase tracking-wider">
                  Pro Plan
                </span>
              </div>
              <h2 className="text-white font-display font-bold text-xl mb-2">
                Grow your business faster
              </h2>
              <p className="text-white/70 text-sm max-w-sm">
                Get unlimited updates, priority ranking, advanced analytics and more.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="bg-card p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {/* Plan selector */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Choose a plan</p>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(({ type, label, price, period, save }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedPlan(type)}
                    className={cn(
                      "relative rounded-xl border p-3 text-center transition-all",
                      selectedPlan === type
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {save && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-orange-500 text-white rounded-full px-1.5 py-0.5 whitespace-nowrap">
                        {save}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-display font-bold text-foreground text-sm">{price}</p>
                    <p className="text-[10px] text-muted-foreground">{period}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/25 h-11"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              Upgrade to Pro
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secure payment via Stripe · Cancel anytime · 7-day money-back guarantee
            </p>
          </div>
        </div>
      )}

      {/* Manage billing link if Pro */}
      {isPro && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-3">Billing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your payment method, download invoices, or cancel your subscription via the Stripe billing portal.
          </p>
          <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Open Billing Portal
            <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
