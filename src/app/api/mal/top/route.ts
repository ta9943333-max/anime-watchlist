import { NextResponse } from "next/server";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";

const SEASONS = ["winter", "spring", "summer", "fall"] as const;

async function fetchJikan(url: string): Promise<JikanAnime[]> {
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data: JikanAnime[] };
  return payload.data ?? [];
}

function dedupeByMalId(anime: JikanAnime[]): JikanAnime[] {
  const seen = new Map<number, JikanAnime>();
  for (const item of anime) {
    if (!seen.has(item.mal_id)) {
      seen.set(item.mal_id, item);
    }
  }
  return [...seen.values()];
}

function sortByScore(anime: JikanAnime[]): JikanAnime[] {
  return [...anime].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "popular";
  const limit = Math.min(Number(searchParams.get("limit") ?? 25), 50);

  try {
    let data: JikanAnime[] = [];

    if (type === "popular") {
      data = await fetchJikan(
        `https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=${limit}`,
      );
    } else if (type === "airing") {
      data = await fetchJikan(
        `https://api.jikan.moe/v4/top/anime?filter=airing&limit=${limit}`,
      );
    } else if (type === "season") {
      data = sortByScore(await fetchJikan("https://api.jikan.moe/v4/seasons/now"));
    } else if (type === "year") {
      const year = new Date().getFullYear();
      const batches = await Promise.all(
        SEASONS.map((season) =>
          fetchJikan(`https://api.jikan.moe/v4/seasons/${year}/${season}`),
        ),
      );
      data = sortByScore(dedupeByMalId(batches.flat()));
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const results = data.slice(0, limit).map(mapJikanAnime);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch top anime" },
      { status: 500 },
    );
  }
}
