import { NextResponse } from "next/server";
import { getAnilistSession } from "@/lib/anilist/session";

export async function GET() {
  const session = await getAnilistSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      name: session.userName,
      avatarUrl: session.avatarUrl,
      scoreFormat: session.scoreFormat,
    },
  });
}
