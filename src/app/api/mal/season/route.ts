import { NextResponse } from "next/server";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";

const VALID_FILTERS = new Set(["now", "upcoming"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "now";

  if (!VALID_FILTERS.has(filter)) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.jikan.moe/v4/seasons/${filter}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Jikan API error" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { data: JikanAnime[] };
    const results = payload.data.map(mapJikanAnime);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch season anime from MyAnimeList" },
      { status: 500 },
    );
  }
}
