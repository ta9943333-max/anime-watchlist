export const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
export const ANILIST_OAUTH_AUTHORIZE_URL =
  "https://anilist.co/api/v2/oauth/authorize";
export const ANILIST_OAUTH_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

export const ANILIST_SESSION_COOKIE = "anilist-session";
export const ANILIST_RATE_LIMIT_PER_MIN = 90;
export const MUTATION_BATCH_SIZE = 5;

export function getAnilistClientId(): string | null {
  return process.env.ANILIST_CLIENT_ID?.trim() || null;
}

export function getAnilistClientSecret(): string | null {
  return process.env.ANILIST_CLIENT_SECRET?.trim() || null;
}

export function getAnilistRedirectUri(origin?: string): string {
  const env = process.env.ANILIST_REDIRECT_URI?.trim();
  if (env) return env;
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/anilist/auth/callback`;
}

export function isAnilistOAuthConfigured(): boolean {
  return Boolean(getAnilistClientId() && getAnilistClientSecret());
}
