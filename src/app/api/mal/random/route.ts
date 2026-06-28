import { NextResponse } from "next/server";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";

export async function GET() {
  try {
    const response = await fetch("https://api.jikan.moe/v4/random/anime", {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Jikan API error" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as { data: JikanAnime };
    const result = mapJikanAnime(payload.data);

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch random anime" },
      { status: 500 },
    );
  }
}
