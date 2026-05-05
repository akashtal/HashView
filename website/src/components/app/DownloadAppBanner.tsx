"use client";

import { Smartphone, Apple, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGate, type FeatureGateKey, APP_STORE_URL, PLAY_STORE_URL } from "@/lib/feature-gates";

interface DownloadAppBannerProps {
  feature: FeatureGateKey;
  className?: string;
  variant?: "inline" | "card";
}

export function DownloadAppBanner({
  feature,
  className,
  variant = "card",
}: DownloadAppBannerProps) {
  const gate = getGate(feature);

  if (variant === "inline") {
    return (
      <div className={cn(
        "flex items-center gap-3 rounded-xl p-3 bg-primary/5 border border-primary/20",
        className
      )}>
        <div className="rounded-lg bg-primary/10 p-2 shrink-0">
          <Smartphone className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{gate.ctaLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gate.ctaDescription}</p>
        </div>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 bg-primary text-white text-xs font-semibold rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
        >
          <Download className="w-3 h-3" />
          Get App
        </a>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-purple-800 p-6 text-white",
      className
    )}>
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-white/15 p-3 shrink-0">
          <Smartphone className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{gate.ctaLabel}</h3>
          <p className="text-white/80 text-sm leading-relaxed">{gate.ctaDescription}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl py-2.5 transition-all duration-200 font-semibold text-sm"
        >
          <Apple className="w-4 h-4" />
          App Store
        </a>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-white text-violet-700 hover:bg-white/90 rounded-xl py-2.5 transition-all duration-200 font-semibold text-sm"
        >
          <Smartphone className="w-4 h-4" />
          Google Play
        </a>
      </div>
    </div>
  );
}
