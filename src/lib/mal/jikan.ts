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
