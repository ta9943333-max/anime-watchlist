import { NextResponse } from "next/server";
import {
  getSiteAccessCode,
  setAccessCookie,
  clearAccessCookie,
} from "@/lib/access";

export async function POST(request: Request) {
  const code = getSiteAccessCode();
  if (!code) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim();

  if (!password || password !== code) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setAccessCookie(response);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAccessCookie(response);
}
