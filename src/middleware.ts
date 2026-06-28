import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, getSiteAccessCode, isAccessGranted } from "@/lib/access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/access") ||
    pathname.startsWith("/api/access") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!getSiteAccessCode()) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(ACCESS_COOKIE)?.value;
  if (isAccessGranted(cookie)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
