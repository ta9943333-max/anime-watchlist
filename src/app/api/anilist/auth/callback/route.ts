import { NextResponse } from "next/server";
import {
  ANILIST_OAUTH_TOKEN_URL,
  getAnilistClientId,
  getAnilistClientSecret,
  getAnilistRedirectUri,
} from "@/lib/anilist/config";
import { anilistGraphql } from "@/lib/anilist/graphql";
import { VIEWER_QUERY } from "@/lib/anilist/queries";
import {
  setAnilistSessionCookie,
  type AnilistSessionPayload,
} from "@/lib/anilist/session";
import type { AnilistViewer } from "@/lib/anilist/types";
import type { ScoreFormat } from "@/lib/anilist/rating";
import { DEFAULT_SCORE_FORMAT } from "@/lib/anilist/rating";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    const redirect = NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error ?? "missing_code")}`, url.origin),
    );
    return redirect;
  }

  const clientId = getAnilistClientId();
  const clientSecret = getAnilistClientSecret();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_not_configured", url.origin),
    );
  }

  const redirectUri = getAnilistRedirectUri(url.origin);

  const tokenResponse = await fetch(ANILIST_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/?auth_error=token_exchange_failed", url.origin),
    );
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
  };
  const accessToken = tokenPayload.access_token;
  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/?auth_error=no_access_token", url.origin),
    );
  }

  const viewerResult = await anilistGraphql<{ Viewer: AnilistViewer }>(
    VIEWER_QUERY,
    undefined,
    accessToken,
  );

  const viewer = viewerResult.data?.Viewer;
  if (!viewer) {
    return NextResponse.redirect(
      new URL("/?auth_error=viewer_fetch_failed", url.origin),
    );
  }

  const session: AnilistSessionPayload = {
    accessToken,
    userId: viewer.id,
    userName: viewer.name,
    avatarUrl: viewer.avatar?.large ?? viewer.avatar?.medium ?? null,
    scoreFormat:
      (viewer.options?.scoreFormat as ScoreFormat | undefined) ??
      DEFAULT_SCORE_FORMAT,
  };

  const response = NextResponse.redirect(
    new URL(`/user/${encodeURIComponent(viewer.name)}/animelist`, url.origin),
  );
  return setAnilistSessionCookie(response, session);
}
