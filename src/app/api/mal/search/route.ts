import { NextResponse } from "next/server";
import { parseMalDuration } from "@/lib/mal/jikan";

type JikanGenre = { name: string };
type JikanAnime = {
  mal_id: number;
  title: string;
  episodes: number | null;
  duration: string | null;
  genres: JikanGenre[];
  images?: { jpg?: { image_url?: string } };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Jikan API error" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { data: JikanAnime[] };
    const results = payload.data.map((anime) => {
      const { episodeDurationMin, totalDurationMin } = parseMalDuration(
        anime.duration,
        anime.episodes,
      );

      return {
        malId: anime.mal_id,
        title: anime.title,
        episodes: anime.episodes,
        episodeDurationMin,
        totalDurationMin,
        genres: anime.genres.map((genre) => genre.name),
        imageUrl: anime.images?.jpg?.image_url ?? null,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from MyAnimeList" },
      { status: 500 },
    );
  }
}
