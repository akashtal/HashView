"use client";

/**
 * useGuestGuard
 * ─────────────────────────────────────────────────────────────────────────────
 * Redirects guest users away from authenticated-only pages.
 * Usage: Call at the top of any page component that guests cannot access.
 *
 * Returns `true` while redirecting (so you can return null early in the page).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useGuestGuard(redirectTo = "/login") {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const isGuest = user?.role === "guest" || user?.isGuest === true;
  const shouldRedirect = !loading && isAuthenticated && isGuest;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(`${redirectTo}?reason=guest`);
    }
  }, [shouldRedirect, router, redirectTo]);

  return shouldRedirect;
}
