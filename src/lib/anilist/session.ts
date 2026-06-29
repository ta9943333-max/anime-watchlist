import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ANILIST_SESSION_COOKIE } from "@/lib/anilist/config";
import type { ScoreFormat } from "@/lib/anilist/rating";

export type AnilistSessionPayload = {
  accessToken: string;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  scoreFormat: ScoreFormat;
};

function encodeSession(payload: AnilistSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeSession(value: string): AnilistSessionPayload | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as AnilistSessionPayload;
    if (!parsed.accessToken || !parsed.userId || !parsed.userName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getAnilistSession(): Promise<AnilistSessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ANILIST_SESSION_COOKIE)?.value;
  if (!value) return null;
  return decodeSession(value);
}

export function setAnilistSessionCookie(
  response: NextResponse,
  payload: AnilistSessionPayload,
): NextResponse {
  response.cookies.set(ANILIST_SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}

export function clearAnilistSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ANILIST_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
