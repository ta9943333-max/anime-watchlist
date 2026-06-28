import { NextResponse } from "next/server";
import { searchAnilistAnime } from "@/lib/anilist/search";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";
import { rankSearchResults } from "@/lib/mal/search-rank";

const SEARCH_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [jikanResponse, anilistResults] = await Promise.all([
      fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`,
        { next: { revalidate: 86400 } },
      ),
      searchAnilistAnime(query, SEARCH_LIMIT),
    ]);

    const jikanResults =
      jikanResponse.ok
        ? (
            (await jikanResponse.json()) as { data: JikanAnime[] }
          ).data.map(mapJikanAnime)
        : [];

    const merged = rankSearchResults(query, [...anilistResults, ...jikanResults]);

    return NextResponse.json({
      results: merged.slice(0, SEARCH_LIMIT),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch search results" },
      { status: 500 },
    );
  }
}
