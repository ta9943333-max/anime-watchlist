import type { AnimeStatus } from "@/lib/statuses";
import { buildCoverFallbacks } from "@/lib/anime/cover";

export type MalSearchResult = {
  malId: number;
  anilistId?: number;
  title: string;
  titleEnglish: string | null;
  titleRomaji?: string | null;
  seriesKey: string;
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
  genres: string[];
  malStatus: string | null;
  imageUrl: string | null;
  airedFrom: string | null;
  airedTo: string | null;
  broadcastDay: string | null;
  broadcastTime: string | null;
  malSeason: string | null;
  malYear: number | null;
  synopsis: string | null;
  studios: string[];
  score: number | null;
  nextEpisode?: number | null;
  timeUntilAiring?: number | null;
  airingAt?: number | null;
  anilistStatus?: string | null;
};

export type DiscoverItem = MalSearchResult & {
  anilistId?: number;
  watchlistId?: string;
  myStatus?: AnimeStatus;
  myEpisodesWatched?: number | null;
  myRewatchCount?: number | null;
  myRating?: number;
};

export function parseMalDuration(
  duration: string | null | undefined,
  episodes: number | null,
): { episodeDurationMin: number | null; totalDurationMin: number | null } {
  if (!duration?.trim()) {
    return { episodeDurationMin: null, totalDurationMin: null };
  }

  const normalized = duration.trim();
  const epCount =
    episodes != null && episodes > 0 ? Math.floor(episodes) : null;

  const perEpMatch = normalized.match(/(\d+)\s*min\.?\s*per ep/i);
  if (perEpMatch) {
    const episodeDurationMin = Number(perEpMatch[1]);
    return {
      episodeDurationMin,
      totalDurationMin:
        epCount != null ? episodeDurationMin * epCount : null,
    };
  }

  const hrMinMatch = normalized.match(
    /(?:(\d+)\s*hr\.?\s*)?(?:(\d+)\s*min\.?)?/i,
  );
  if (hrMinMatch && (hrMinMatch[1] || hrMinMatch[2])) {
    const hours = Number(hrMinMatch[1] || 0);
    const mins = Number(hrMinMatch[2] || 0);
    const total = hours * 60 + mins;
    if (total > 0) {
      if (epCount == null || epCount <= 1) {
        return { episodeDurationMin: total, totalDurationMin: total };
      }
      if (total % epCount === 0) {
        return {
          episodeDurationMin: total / epCount,
          totalDurationMin: total,
        };
      }
      if (total < 120) {
        return {
          episodeDurationMin: total,
          totalDurationMin: total * epCount,
        };
      }
      return { episodeDurationMin: total, totalDurationMin: total };
    }
  }

  const minOnly = normalized.match(/^(\d+)\s*min\.?$/i);
  if (minOnly) {
    const mins = Number(minOnly[1]);
    if (epCount != null && epCount > 1) {
      return {
        episodeDurationMin: mins,
        totalDurationMin: mins * epCount,
      };
    }
    return { episodeDurationMin: mins, totalDurationMin: mins };
  }

  return { episodeDurationMin: null, totalDurationMin: null };
}

export async function searchMalAnime(query: string): Promise<MalSearchResult[]> {
  const response = await fetch(
    `/api/mal/search?q=${encodeURIComponent(query.trim())}`,
  );

  if (!response.ok) {
    throw new Error("MyAnimeList search failed");
  }

  const data = (await response.json()) as { results: MalSearchResult[] };
  return data.results;
}

export async function fetchMalSeason(
  filter: "now" | "upcoming",
): Promise<MalSearchResult[]> {
  const response = await fetch(`/api/mal/season?filter=${filter}`);

  if (!response.ok) {
    throw new Error("MyAnimeList season fetch failed");
  }

  const data = (await response.json()) as { results: MalSearchResult[] };
  return data.results;
}

export type MalPagination = {
  currentPage: number;
  lastVisiblePage: number;
  hasNextPage: boolean;
  total: number;
  perPage: number;
  count: number;
};

export type MalBrowseResponse = {
  results: MalSearchResult[];
  pagination: MalPagination;
};

export async function fetchMalBrowse(
  page = 1,
  limit = 25,
): Promise<MalBrowseResponse> {
  const response = await fetch(
    `/api/mal/browse?page=${page}&limit=${limit}&order_by=popularity&sort=desc`,
  );

  if (!response.ok) {
    throw new Error("MyAnimeList browse failed");
  }

  return (await response.json()) as MalBrowseResponse;
}

export async function fetchMalRandom(): Promise<MalSearchResult> {
  const response = await fetch("/api/mal/random", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("MyAnimeList random fetch failed");
  }

  const data = (await response.json()) as { result: MalSearchResult };
  return data.result;
}

export type MalTopType = "popular" | "airing" | "season" | "year";

export async function fetchMalTop(
  type: MalTopType,
  limit = 25,
): Promise<MalSearchResult[]> {
  const response = await fetch(
    `/api/mal/top?type=${type}&limit=${limit}`,
  );

  if (!response.ok) {
    throw new Error("MyAnimeList top fetch failed");
  }

  const data = (await response.json()) as { results: MalSearchResult[] };
  return data.results;
}

export async function fetchMalAnimeDetails(
  malIds: number[],
): Promise<Map<number, MalSearchResult>> {
  if (malIds.length === 0) return new Map();

  const unique = [...new Set(malIds.filter((id) => id > 0))];
  const map = new Map<number, MalSearchResult>();

  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8);
    const response = await fetch(
      `/api/mal/details?ids=${batch.join(",")}`,
    );

    if (!response.ok) continue;

    const data = (await response.json()) as { results: MalSearchResult[] };
    for (const item of data.results) {
      map.set(item.malId, item);
    }
  }

  return map;
}

export async function hydrateDiscoverImages(
  items: DiscoverItem[],
): Promise<DiscoverItem[]> {
  const missingIds = items
    .filter((item) => item.malId > 0 && !item.imageUrl)
    .map((item) => item.malId);

  if (missingIds.length === 0) return items;

  const details = await fetchMalAnimeDetails(missingIds);

  return items.map((item) => {
    const extra = details.get(item.malId);
    const merged = extra
      ? {
          ...item,
          imageUrl: item.imageUrl ?? extra.imageUrl,
          synopsis: item.synopsis ?? extra.synopsis,
          studios: item.studios.length > 0 ? item.studios : extra.studios,
          score: item.score ?? extra.score,
          malStatus: item.malStatus ?? extra.malStatus,
        }
      : item;

    if (merged.imageUrl) return merged;

    const fallbacks = buildCoverFallbacks({
      anilistId: merged.anilistId,
      malId: merged.malId,
      malImageUrl: merged.imageUrl,
    });
    return {
      ...merged,
      imageUrl: fallbacks[0] ?? null,
    };
  });
}
