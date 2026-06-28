import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  clearAccessCookie,
  getAccessMode,
  getLoggedInMember,
  getMemberPasswords,
  getSiteAccessCode,
  setMemberCookie,
  setSiteCookie,
  verifyMemberLogin,
} from "@/lib/access";

export async function GET() {
  const mode = getAccessMode();
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACCESS_COOKIE)?.value;

  return NextResponse.json({
    mode,
    member: getLoggedInMember(cookieValue),
    names: mode === "member" ? Object.keys(getMemberPasswords()) : [],
  });
}

export async function POST(request: Request) {
  const mode = getAccessMode();
  if (mode === "open") {
    return NextResponse.json({ ok: true, mode, member: null });
  }

  const body = (await request.json()) as { name?: string; password?: string };
  const password = body.password?.trim() ?? "";

  if (mode === "site") {
    if (!password || password !== getSiteAccessCode()) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, mode, member: null });
    return setSiteCookie(response);
  }

  const member = verifyMemberLogin(body.name ?? "", password);
  if (!member) {
    return NextResponse.json(
      { error: "Wrong name or password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, mode, member });
  return setMemberCookie(response, member);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  return clearAccessCookie(response);
}
