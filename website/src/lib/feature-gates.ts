/**
 * HashView Feature Gates
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines which mobile features are restricted on the web, and what CTA
 * message to show instead. Components should check these before rendering
 * interactive elements.
 *
 * Per user decision:
 *   - Review submission  → ❌ web restricted, show "Download App" CTA
 *   - Coupon redemption  → ❌ web restricted, show "Download App" CTA
 *   - Offer claiming     → ❌ web restricted, show "Download App" CTA
 *   - QR scanning        → ❌ web restricted, show "Download App" CTA
 *   - View reviews       → ✅ allowed (read-only)
 *   - View coupons       → ✅ allowed (read-only)
 *   - View offers        → ✅ allowed (read-only)
 */

export const APP_STORE_URL = 'https://apps.apple.com/us/app/hashview/id6756681321';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share';

/**
 * Build an iOS App Store URL.
 * If a businessId is provided we pass the deep-link as the `referrer` param
 * so that when the user opens the app after install it can read it.
 * For already-installed apps on iOS, Universal Links (hashview.co.uk/business/:id)
 * are handled by the OS — they open the app directly.
 */
export function buildAppStoreUrl(businessId?: string): string {
  if (!businessId) return APP_STORE_URL;
  // The at= parameter is ignored by App Store but we use ct= as campaign token
  // to carry the business id. The real deep link for already-installed apps
  // happens via the Universal Link returned by buildUniversalLink().
  return `${APP_STORE_URL}&ct=business_${businessId}`;
}

/**
 * Build an Android intent:// URI.
 * This tries to open the app directly on the business screen.
 * If the app is NOT installed, Android falls back to the Play Store URL.
 * The `S.browser_fallback_url` param is the Play Store page.
 */
export function buildPlayStoreUrl(businessId?: string): string {
  if (!businessId) return PLAY_STORE_URL;
  // Build the intent URI: tries hashview://business/:id first, fallback to Play Store
  const fallback = encodeURIComponent(
    `${PLAY_STORE_URL}&referrer=business_${businessId}`
  );
  return `intent://business/${businessId}#Intent;scheme=hashview;package=com.hashview.apps;S.browser_fallback_url=${fallback};end`;
}

/**
 * Build a Universal Link for iOS.
 * When the HashView app IS installed, iOS intercepts this https:// link
 * and opens the app directly on the business screen (via Associated Domains).
 * When NOT installed, Safari opens the website page instead.
 */
export function buildUniversalLink(businessId?: string): string {
  if (!businessId) return 'https://hashview.co.uk';
  return `https://hashview.co.uk/business/${businessId}`;
}

export interface FeatureGate {
  /** Is this feature restricted on web? */
  restricted: boolean;
  /** Short CTA label for buttons */
  ctaLabel: string;
  /** Full description shown in modal/banner */
  ctaDescription: string;
  /** Icon name (lucide-react) */
  icon: string;
}

export const FEATURE_GATES = {
  SUBMIT_REVIEW: {
    restricted: true,
    ctaLabel: 'Download App to Review',
    ctaDescription:
      'Verified reviews can only be submitted in-person via the HashView mobile app. Download the app to leave a verified review and earn rewards.',
    icon: 'Star',
  },
  REDEEM_COUPON: {
    restricted: true,
    ctaLabel: 'Redeem via App',
    ctaDescription:
      'Coupon redemption requires the HashView mobile app. Download the app to scan your coupon at the business.',
    icon: 'Ticket',
  },
  CLAIM_OFFER: {
    restricted: true,
    ctaLabel: 'Claim via App',
    ctaDescription:
      'Claiming offers is done in-person via the HashView mobile app. Download the app to claim this offer.',
    icon: 'Tag',
  },
  QR_SCAN: {
    restricted: true,
    ctaLabel: 'Scan via App',
    ctaDescription:
      'QR code scanning requires the HashView mobile app. Download the app to scan business QR codes.',
    icon: 'QrCode',
  },
  BUSINESS_QR_SCAN: {
    restricted: true,
    ctaLabel: 'Scan Coupons via App',
    ctaDescription:
      'Scanning customer coupons and verifying reviews requires the HashView mobile app for Business Owners. Download the app to securely process transactions in-store.',
    icon: 'QrCode',
  },
  GENERAL_DOWNLOAD: {
    restricted: true,
    ctaLabel: 'Download HashView App',
    ctaDescription:
      'Get the free HashView mobile app to write reviews, claim offers, and earn rewards on the go.',
    icon: 'Smartphone',
  },
} as const satisfies Record<string, FeatureGate>;

export type FeatureGateKey = keyof typeof FEATURE_GATES;

/** Check if a feature is restricted on web */
export function isRestricted(feature: FeatureGateKey): boolean {
  return FEATURE_GATES[feature].restricted;
}

/** Get the feature gate config */
export function getGate(feature: FeatureGateKey): FeatureGate {
  return FEATURE_GATES[feature];
}
