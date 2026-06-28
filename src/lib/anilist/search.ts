import {
  mapAnilistMediaToDiscoverItem,
  type AnilistMediaNode,
} from "@/lib/anilist/map-media";
import type { MalSearchResult } from "@/lib/mal/jikan";

const ANILIST_URL = "https://graphql.anilist.co";

const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
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

async function fetchAnilistSearchPage(
  query: string,
  page: number,
  perPage: number,
): Promise<MalSearchResult[]> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { search: query, page, perPage },
    }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    data?: { Page?: { media: AnilistMediaNode[] } };
  };

  return (payload.data?.Page?.media ?? []).map((media) => {
    const item = mapAnilistMediaToDiscoverItem(media);
    return item as MalSearchResult;
  });
}

export async function searchAnilistAnime(
  query: string,
  perPage = 50,
  pages = 2,
): Promise<MalSearchResult[]> {
  const pageResults = await Promise.all(
    Array.from({ length: pages }, (_, index) =>
      fetchAnilistSearchPage(query, index + 1, perPage),
    ),
  );

  return pageResults.flat();
}
