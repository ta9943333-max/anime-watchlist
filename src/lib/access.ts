import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "watchlist-access";

export type AccessMode = "open" | "site" | "member";

/**
 * Per-Person-Passwörter aus der Umgebungsvariable MEMBER_PASSWORDS (JSON).
 * Beispiel: {"Ricardo":"pw1","Leonard":"pw2","Alex":"pw3"}
 */
export function getMemberPasswords(): Record<string, string> {
  const raw = process.env.MEMBER_PASSWORDS?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(parsed)) {
      const trimmedName = name.trim();
      const password = String(value).trim();
      if (trimmedName && password) {
        result[trimmedName] = password;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function getSiteAccessCode(): string | null {
  const code = process.env.SITE_ACCESS_CODE?.trim();
  return code || null;
}

export function getAccessMode(): AccessMode {
  if (Object.keys(getMemberPasswords()).length > 0) return "member";
  if (getSiteAccessCode()) return "site";
  return "open";
}

function splitCookie(value: string): { prefix: string; rest: string } {
  const idx = value.indexOf(":");
  if (idx === -1) return { prefix: value, rest: "" };
  return { prefix: value.slice(0, idx), rest: value.slice(idx + 1) };
}

/** Findet den freigeschalteten Namen unabhängig von Groß-/Kleinschreibung. */
export function resolveMemberName(name: string): string | null {
  const target = name.trim().toLowerCase();
  const passwords = getMemberPasswords();
  for (const key of Object.keys(passwords)) {
    if (key.toLowerCase() === target) return key;
  }
  return null;
}

export function verifyMemberLogin(
  name: string,
  password: string,
): string | null {
  const canonical = resolveMemberName(name);
  if (!canonical) return null;
  const passwords = getMemberPasswords();
  return passwords[canonical] === password.trim() ? canonical : null;
}

export function isAccessGranted(cookieValue: string | undefined): boolean {
  const mode = getAccessMode();
  if (mode === "open") return true;
  if (!cookieValue) return false;

  if (mode === "site") {
    return cookieValue === `site:${getSiteAccessCode()}`;
  }

  const { prefix, rest } = splitCookie(cookieValue);
  if (prefix !== "member" || !rest) return false;
  return resolveMemberName(rest) !== null;
}

/** Liefert den eingeloggten Mitgliedsnamen (nur im member-Modus). */
export function getLoggedInMember(
  cookieValue: string | undefined,
): string | null {
  if (getAccessMode() !== "member" || !cookieValue) return null;
  const { prefix, rest } = splitCookie(cookieValue);
  if (prefix !== "member") return null;
  return resolveMemberName(rest);
}

export function buildCookieValue(): string | null {
  const mode = getAccessMode();
  if (mode === "site") return `site:${getSiteAccessCode()}`;
  return null;
}

function writeCookie(response: NextResponse, value: string): NextResponse {
  response.cookies.set(ACCESS_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return response;
}

export function setSiteCookie(response: NextResponse): NextResponse {
  const code = getSiteAccessCode();
  if (!code) return response;
  return writeCookie(response, `site:${code}`);
}

export function setMemberCookie(
  response: NextResponse,
  memberName: string,
): NextResponse {
  return writeCookie(response, `member:${memberName}`);
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
