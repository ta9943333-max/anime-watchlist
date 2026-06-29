import { ANILIST_GRAPHQL_URL } from "@/lib/anilist/config";

export type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const requestTimestamps: number[] = [];

function pruneRateLimitWindow() {
  const cutoff = Date.now() - 60_000;
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < cutoff) {
    requestTimestamps.shift();
  }
}

async function waitForRateLimit(maxPerMinute: number) {
  pruneRateLimitWindow();
  if (requestTimestamps.length < maxPerMinute) return;
  const waitMs = requestTimestamps[0]! + 60_000 - Date.now() + 50;
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  pruneRateLimitWindow();
}

export async function anilistGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string | null,
): Promise<GraphqlResponse<T>> {
  await waitForRateLimit(90);
  requestTimestamps.push(Date.now());

  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`AniList GraphQL HTTP ${response.status}`);
  }

  return (await response.json()) as GraphqlResponse<T>;
}
