import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

// Routes that require authentication (customer + business)
const APP_PROTECTED_ROUTES = [
  '/dashboard',
  '/account',
  '/favorites',
  '/history',
  '/notifications',
  '/coupons',
  '/help',
  '/claim-business',
  '/explore',
  '/search',
  '/register-business',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin routes protection ──────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("admin-token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin-token");
      return response;
    }
  }

  // ── App routes protection (customer + business owner) ────────────────────
  // These routes require a HashView user JWT (stored in localStorage on client,
  // NOT a cookie — so we can't verify here server-side without the cookie).
  // We redirect to /login; the client-side AuthProvider handles final validation.
  const isAppRoute = APP_PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isAppRoute) {
    // Check for the app auth token cookie (set during login by AuthProvider)
    const appToken = request.cookies.get("hv_token")?.value;
    if (!appToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/favorites/:path*",
    "/history/:path*",
    "/notifications/:path*",
    "/coupons/:path*",
    "/help/:path*",
    "/claim-business/:path*",
    "/register-business/:path*",
  ],
};

