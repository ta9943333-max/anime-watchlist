import { NextResponse } from "next/server";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";

const MAX_IDS = 8;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids")?.trim();

  if (!raw) {
    return NextResponse.json({ results: [] });
  }

  const ids = [...new Set(raw.split(",").map(Number).filter((id) => id > 0))].slice(
    0,
    MAX_IDS,
  );

  if (ids.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = [];

    for (const id of ids) {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
        next: { revalidate: 86400 },
      });

      if (response.ok) {
        const payload = (await response.json()) as { data: JikanAnime };
        results.push(mapJikanAnime(payload.data));
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch anime details" },
      { status: 500 },
    );
  }
}
