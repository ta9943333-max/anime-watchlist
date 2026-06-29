import type { DiscoverItem } from "@/lib/mal/jikan";
import { mapJikanAnime } from "@/lib/mal/map-anime";
import { mapAnilistMediaToDiscoverItem } from "@/lib/anilist/map-media";

export type MediaFetchSource = "cache" | "anilist" | "jikan";

export type NormalizedMedia = DiscoverItem & {
  source: MediaFetchSource;
  stale?: boolean;
};

const memoryCache = new Map<string, { data: NormalizedMedia; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(anilistId?: number | null, malId?: number | null): string | null {
  if (anilistId && anilistId > 0) return `anilist:${anilistId}`;
  if (malId && malId > 0) return `mal:${malId}`;
  return null;
}

function readCache(key: string): NormalizedMedia | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return { ...hit.data, source: "cache" };
}

function writeCache(key: string, data: NormalizedMedia) {
  memoryCache.set(key, { data, at: Date.now() });
}

async function fetchFromAnilist(
  anilistId: number,
): Promise<NormalizedMedia | null> {
  const response = await fetch(`/api/anilist/media?id=${anilistId}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { item: DiscoverItem | null };
  if (!payload.item) return null;
  return { ...payload.item, source: "anilist" };
}

async function fetchFromJikan(malId: number): Promise<NormalizedMedia | null> {
  const response = await fetch(`/api/mal/details?ids=${malId}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    results?: ReturnType<typeof mapJikanAnime>[];
  };
  const mal = payload.results?.[0];
  if (!mal) return null;
  return {
    anilistId: 0,
    malId: mal.malId,
    title: mal.title,
    titleEnglish: mal.titleEnglish,
    titleRomaji: mal.titleRomaji,
    seriesKey: mal.seriesKey,
    episodes: mal.episodes,
    episodeDurationMin: mal.episodeDurationMin,
    totalDurationMin: mal.totalDurationMin,
    genres: mal.genres,
    malStatus: mal.malStatus,
    imageUrl: mal.imageUrl,
    airedFrom: mal.airedFrom,
    airedTo: mal.airedTo,
    broadcastDay: mal.broadcastDay,
    broadcastTime: mal.broadcastTime,
    malSeason: mal.malSeason,
    malYear: mal.malYear,
    synopsis: mal.synopsis,
    studios: mal.studios,
    score: mal.score,
    source: "jikan",
  };
}

/**
 * Kaskadierende Ausfallsicherheit: Cache → AniList GraphQL → Jikan REST.
 */
export async function fetchMediaWithFailover(options: {
  anilistId?: number | null;
  malId?: number | null;
}): Promise<NormalizedMedia | null> {
  const key = cacheKey(options.anilistId, options.malId);
  if (key) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  if (options.anilistId && options.anilistId > 0) {
    try {
      const fromAnilist = await fetchFromAnilist(options.anilistId);
      if (fromAnilist) {
        if (key) writeCache(key, fromAnilist);
        return fromAnilist;
      }
    } catch {
      // failover
    }
  }

  if (options.malId && options.malId > 0) {
    try {
      const fromJikan = await fetchFromJikan(options.malId);
      if (fromJikan) {
        if (key) writeCache(key, fromJikan);
        return fromJikan;
      }
    } catch {
      // offline
    }
  }

  if (key) {
    const stale = memoryCache.get(key);
    if (stale) {
      return { ...stale.data, source: "cache", stale: true };
    }
  }

  return null;
}

export { mapAnilistMediaToDiscoverItem };
