import { NextResponse } from "next/server";
import { searchAnilistAnime } from "@/lib/anilist/search";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";
import { rankSearchResults } from "@/lib/mal/search-rank";

const SEARCH_LIMIT = 100;
const JIKAN_PAGE_SIZE = 25;
const JIKAN_PAGES = 2;

async function fetchJikanSearchPage(
  query: string,
  page: number,
): Promise<ReturnType<typeof mapJikanAnime>[]> {
  const response = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=${JIKAN_PAGE_SIZE}&page=${page}`,
    { next: { revalidate: 86400 } },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data: JikanAnime[] };
  return (payload.data ?? []).map(mapJikanAnime);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [jikanPages, anilistResults] = await Promise.all([
      Promise.all(
        Array.from({ length: JIKAN_PAGES }, (_, index) =>
          fetchJikanSearchPage(query, index + 1),
        ),
      ),
      searchAnilistAnime(query, 50, 2),
    ]);

    const jikanResults = jikanPages.flat();
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
