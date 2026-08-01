import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, AUTH_COOKIE } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check signed session cookie
  const session = await verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
