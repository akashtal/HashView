"use client";

import { X, Smartphone, Apple, Download } from "lucide-react";
import { getGate, type FeatureGateKey, buildAppStoreUrl, buildPlayStoreUrl, buildUniversalLink, PLAY_STORE_URL } from "@/lib/feature-gates";

interface DownloadAppModalProps {
  feature: FeatureGateKey | null;
  onClose: () => void;
  /** Business ID to deep-link into. When provided, the app/store links will
   *  open directly on this business screen. */
  businessId?: string;
}

export function DownloadAppModal({ feature, onClose, businessId }: DownloadAppModalProps) {
  if (!feature) return null;
  const gate = getGate(feature);

  // iOS: Universal Link opens the installed app directly; if not installed → website page
  const iosUrl = buildUniversalLink(businessId);
  // Android: intent:// tries the app first; if not installed → Play Store (with referrer)
  const androidUrl = buildPlayStoreUrl(businessId);
  // Fallback App Store URL (carries campaign token for deferred analytics)
  const appStoreUrl = buildAppStoreUrl(businessId);

  // Detect platform to show the most useful link prominently
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 p-6 pb-10">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{gate.ctaLabel}</h2>
          <p className="text-white/80 text-sm leading-relaxed">{gate.ctaDescription}</p>
        </div>
        <div className="-mt-5 bg-card rounded-t-3xl pt-6 px-6 pb-6">
          <p className="text-sm text-muted-foreground text-center mb-5">Download the free HashView app to unlock this feature</p>
          <div className="space-y-3">
            {/* iOS link — Universal Link that opens app directly if installed */}
            <a
              href={isAndroid ? appStoreUrl : iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                <Apple className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Download on the</p>
                <p className="font-bold text-foreground">App Store</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground ml-auto" />
            </a>
            {/* Android link — intent:// opens app directly; falls back to Play Store */}
            <a
              href={isIOS ? PLAY_STORE_URL : androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Get it on</p>
                <p className="font-bold text-foreground">Google Play</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground ml-auto" />
            </a>
          </div>
          <button onClick={onClose} className="w-full mt-4 py-3 rounded-2xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
