import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/adapters/auth/types";

/**
 * UX-only: redirects to /admin/login when the session cookie is simply
 * absent, so a logged-out visitor doesn't see a flash of admin UI before
 * a 401. This is NOT the real authorization check - every admin page and
 * admin API route still calls requireSession() server-side, which verifies
 * the cookie's signature/claims rather than just checking it exists.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname.startsWith("/admin") && !isLoginPage && !hasSessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
