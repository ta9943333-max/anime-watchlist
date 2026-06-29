import { NextResponse } from "next/server";
import { clearAnilistSessionCookie } from "@/lib/anilist/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAnilistSessionCookie(response);
}
