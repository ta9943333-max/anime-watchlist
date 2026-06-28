export type AnilistNextEpisode = {
  episode: number;
  timeUntilAiring: number;
  airingAt: number;
};

export type AnilistAiringInfo = {
  status: string | null;
  nextEpisode: AnilistNextEpisode | null;
};

export async function fetchAnilistNextEpisodes(
  malIds: number[],
): Promise<Record<number, AnilistAiringInfo>> {
  if (malIds.length === 0) return {};

  const response = await fetch("/api/anilist/next-episode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ malIds }),
  });

  if (!response.ok) {
    return {};
  }

  const data = (await response.json()) as {
    results: Record<number, AnilistAiringInfo>;
  };
  return data.results ?? {};
}

export function mergeAnilistAiring<T extends { malId: number }>(
  items: T[],
  airingMap: Record<number, AnilistAiringInfo>,
): (T & {
  nextEpisode: number | null;
  timeUntilAiring: number | null;
  airingAt: number | null;
  anilistStatus: string | null;
})[] {
  return items.map((item) => {
    const info = airingMap[item.malId];
    const next = info?.nextEpisode ?? null;
    return {
      ...item,
      nextEpisode: next?.episode ?? null,
      timeUntilAiring: next?.timeUntilAiring ?? null,
      airingAt: next?.airingAt ?? null,
      anilistStatus: info?.status ?? null,
    };
  });
}
