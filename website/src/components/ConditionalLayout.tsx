"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/CookieConsent";

// Routes that render their own full-screen layouts (no public Navbar/Footer)
const BARE_ROUTES = [
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard",
  "/explore",
  "/search",
  "/business",
  "/favorites",
  "/coupons",
  "/history",
  "/notifications",
  "/account",
  "/help",
  "/claim-business",
  "/register-business",
  "/qr",
  "/qr-code",
];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBareRoute = BARE_ROUTES.some((r) => pathname?.startsWith(r));

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}

