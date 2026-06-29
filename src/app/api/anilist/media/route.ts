import { NextResponse } from "next/server";
import {
  mapAnilistMediaToDiscoverItem,
  type AnilistMediaNode,
} from "@/lib/anilist/map-media";

const ANILIST_URL = "https://graphql.anilist.co";

const MEDIA_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title { romaji english native }
    episodes
    duration
    genres
    status
    description(asHtml: false)
    averageScore
    meanScore
    seasonYear
    season
    startDate { year month day }
    endDate { year month day }
    coverImage { large medium }
    studios(isMain: true) { nodes { name } }
    relations {
      edges {
        relationType
        node {
          id
          idMal
          title { romaji english }
          type
        }
      }
    }
  }
}
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: MEDIA_QUERY,
        variables: { id },
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "AniList API error" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as {
      data?: { Media?: AnilistMediaNode };
      errors?: { message: string }[];
    };

    if (payload.errors?.length || !payload.data?.Media) {
      return NextResponse.json({ item: null }, { status: 404 });
    }

    const media = payload.data.Media;
    const item = mapAnilistMediaToDiscoverItem(media);

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 },
    );
  }
}
