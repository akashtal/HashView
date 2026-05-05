/**
 * Cookie utility functions for managing cookies in the browser
 */

export interface CookiePreferences {
  essential: boolean; // Always true, required for site functionality
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "cookie-consent";
const COOKIE_PREFERENCES_KEY = "cookie-preferences";

/**
 * Set a cookie with optional expiry days
 */
export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof window === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(";");
  
  for (let cookie of cookies) {
    let c = cookie.trim();
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length);
    }
  }
  
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Check if user has given cookie consent
 */
export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  return getCookie(COOKIE_CONSENT_KEY) === "true";
}

/**
 * Set cookie consent status
 */
export function setCookieConsent(consented: boolean): void {
  if (typeof window === "undefined") return;
  setCookie(COOKIE_CONSENT_KEY, consented ? "true" : "false", 365);
}

/**
 * Get user's cookie preferences
 */
export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;

  const preferences = getCookie(COOKIE_PREFERENCES_KEY);
  if (!preferences) return null;

  try {
    return JSON.parse(preferences) as CookiePreferences;
  } catch {
    return null;
  }
}

/**
 * Set user's cookie preferences
 */
export function setCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === "undefined") return;
  setCookie(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences), 365);
}

/**
 * Initialize analytics cookies based on preferences
 */
export function initializeAnalyticsCookies(preferences: CookiePreferences): void {
  if (typeof window === "undefined") return;

  // Essential cookies are always enabled
  if (preferences.essential) {
    // Set any essential cookies here if needed
    setCookie("essential-enabled", "true", 365);
  }

  // Analytics cookies
  if (preferences.analytics) {
    // Initialize analytics here (e.g., Google Analytics)
    // Example: setCookie("analytics-enabled", "true", 365);
    console.log("Analytics cookies enabled");
  } else {
    // Disable/remove analytics cookies
    deleteCookie("analytics-enabled");
  }

  // Marketing cookies
  if (preferences.marketing) {
    // Initialize marketing cookies here (e.g., Facebook Pixel, etc.)
    // Example: setCookie("marketing-enabled", "true", 365);
    console.log("Marketing cookies enabled");
  } else {
    // Disable/remove marketing cookies
    deleteCookie("marketing-enabled");
  }
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  const preferences: CookiePreferences = {
    essential: true,
    analytics: true,
    marketing: true,
  };
  setCookieConsent(true);
  setCookiePreferences(preferences);
  initializeAnalyticsCookies(preferences);
}

/**
 * Reject all optional cookies (only accept essential)
 */
export function rejectOptionalCookies(): void {
  const preferences: CookiePreferences = {
    essential: true,
    analytics: false,
    marketing: false,
  };
  setCookieConsent(true);
  setCookiePreferences(preferences);
  initializeAnalyticsCookies(preferences);
}

/**
 * Save custom cookie preferences
 */
export function saveCookiePreferences(preferences: CookiePreferences): void {
  // Essential is always true
  const finalPreferences: CookiePreferences = {
    ...preferences,
    essential: true,
  };
  setCookieConsent(true);
  setCookiePreferences(finalPreferences);
  initializeAnalyticsCookies(finalPreferences);
}

