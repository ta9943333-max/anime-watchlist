import type { AnimeStatus } from "@/lib/statuses";

export type MalSearchResult = {
  malId: number;
  title: string;
  titleEnglish: string | null;
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
  watchlistId?: string;
  myStatus?: AnimeStatus;
};

export function parseMalDuration(
  duration: string | null | undefined,
  episodes: number | null,
): { episodeDurationMin: number | null; totalDurationMin: number | null } {
  if (!duration) {
    return { episodeDurationMin: null, totalDurationMin: null };
  }

  const perEpMatch = duration.match(/(\d+)\s*min per ep/i);
  if (perEpMatch && episodes) {
    const episodeDurationMin = Number(perEpMatch[1]);
    return {
      episodeDurationMin,
      totalDurationMin: episodeDurationMin * episodes,
    };
  }

  const hrMinMatch = duration.match(/(?:(\d+)\s*hr)?\s*(?:(\d+)\s*min)?/i);
  if (hrMinMatch) {
    const hours = Number(hrMinMatch[1] || 0);
    const mins = Number(hrMinMatch[2] || 0);
    const total = hours * 60 + mins;
    if (total > 0) {
      return { episodeDurationMin: total, totalDurationMin: total };
    }
  }

  const minOnly = duration.match(/(\d+)\s*min/i);
  if (minOnly) {
    const total = Number(minOnly[1]);
    return { episodeDurationMin: total, totalDurationMin: total };
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
    if (!extra) return item;

    return {
      ...item,
      imageUrl: item.imageUrl ?? extra.imageUrl,
      synopsis: item.synopsis ?? extra.synopsis,
      studios: item.studios.length > 0 ? item.studios : extra.studios,
      score: item.score ?? extra.score,
      malStatus: item.malStatus ?? extra.malStatus,
    };
  });
}
