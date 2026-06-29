import { NextResponse } from "next/server";
import {
  ANILIST_OAUTH_AUTHORIZE_URL,
  getAnilistClientId,
  getAnilistRedirectUri,
  isAnilistOAuthConfigured,
} from "@/lib/anilist/config";

export async function GET(request: Request) {
  if (!isAnilistOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "AniList OAuth nicht konfiguriert. Setze ANILIST_CLIENT_ID und ANILIST_CLIENT_SECRET.",
      },
      { status: 503 },
    );
  }

  const clientId = getAnilistClientId()!;
  const origin = new URL(request.url).origin;
  const redirectUri = getAnilistRedirectUri(origin);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  return NextResponse.redirect(`${ANILIST_OAUTH_AUTHORIZE_URL}?${params}`);
}
