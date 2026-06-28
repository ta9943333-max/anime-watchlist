import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "watchlist-access";

export function getSiteAccessCode(): string | null {
  const code = process.env.SITE_ACCESS_CODE?.trim();
  return code || null;
}

export function isAccessGranted(cookieValue: string | undefined): boolean {
  const code = getSiteAccessCode();
  if (!code) return true;
  return cookieValue === code;
}

export function setAccessCookie(response: NextResponse): NextResponse {
  const code = getSiteAccessCode();
  if (!code) return response;

  response.cookies.set(ACCESS_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });

  return response;
}

export function clearAccessCookie(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
