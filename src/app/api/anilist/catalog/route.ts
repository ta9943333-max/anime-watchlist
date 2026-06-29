import { NextResponse } from "next/server";
import {
  mapAnilistMediaToDiscoverItem,
  type AnilistMediaNode,
} from "@/lib/anilist/map-media";

const ANILIST_URL = "https://graphql.anilist.co";
const PER_PAGE = 50;

const CATALOG_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: ANIME, sort: ID, isAdult: false) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      episodes
      duration
      genres
      status
      description(asHtml: false)
      averageScore
      coverImage {
        large
        medium
      }
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      season
      seasonYear
      studios(isMain: true) {
        nodes {
          name
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
        airingAt
      }
    }
  }
}
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  try {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: CATALOG_QUERY,
        variables: { page, perPage: PER_PAGE },
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
      data?: {
        Page?: {
          pageInfo: {
            total: number;
            currentPage: number;
            lastPage: number;
            hasNextPage: boolean;
            perPage: number;
          };
          media: AnilistMediaNode[];
        };
      };
      errors?: { message: string }[];
    };

    if (payload.errors?.length) {
      return NextResponse.json(
        { error: payload.errors[0]?.message ?? "AniList GraphQL error" },
        { status: 502 },
      );
    }

    const pageData = payload.data?.Page;
    if (!pageData) {
      return NextResponse.json({ error: "Empty AniList response" }, { status: 502 });
    }

    const items = pageData.media.map(mapAnilistMediaToDiscoverItem);

    return NextResponse.json({
      items,
      pageInfo: {
        total: pageData.pageInfo.total,
        currentPage: pageData.pageInfo.currentPage,
        lastPage: pageData.pageInfo.lastPage,
        hasNextPage: pageData.pageInfo.hasNextPage,
        perPage: pageData.pageInfo.perPage,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch AniList catalog page" },
      { status: 500 },
    );
  }
}
