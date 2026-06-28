import { NextResponse } from "next/server";

const ANILIST_URL = "https://graphql.anilist.co";
const BATCH_SIZE = 20;

type AnilistMedia = {
  idMal: number | null;
  status: string | null;
  nextAiringEpisode: {
    episode: number;
    timeUntilAiring: number;
    airingAt: number;
  } | null;
};

function buildBatchQuery(malIds: number[]): string {
  const fields = malIds
    .map(
      (id, index) =>
        `m${index}: Media(idMal: ${id}, type: ANIME) {
          idMal
          status
          nextAiringEpisode {
            episode
            timeUntilAiring
            airingAt
          }
        }`,
    )
    .join("\n");

  return `query { ${fields} }`;
}

async function fetchBatch(
  malIds: number[],
): Promise<Record<number, AnilistAiringInfo>> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: buildBatchQuery(malIds) }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json()) as {
    data?: Record<string, AnilistMedia | null>;
  };

  const results: Record<number, AnilistAiringInfo> = {};

  for (const entry of Object.values(payload.data ?? {})) {
    if (!entry?.idMal) continue;
    results[entry.idMal] = {
      status: entry.status,
      nextEpisode: entry.nextAiringEpisode,
    };
  }

  return results;
}

type AnilistAiringInfo = {
  status: string | null;
  nextEpisode: {
    episode: number;
    timeUntilAiring: number;
    airingAt: number;
  } | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { malIds?: number[] };
    const malIds = (body.malIds ?? []).filter(
      (id) => typeof id === "number" && id > 0,
    );

    if (malIds.length === 0) {
      return NextResponse.json({ results: {} });
    }

    const uniqueIds = [...new Set(malIds)];
    const results: Record<number, AnilistAiringInfo> = {};

    for (let index = 0; index < uniqueIds.length; index += BATCH_SIZE) {
      const batch = uniqueIds.slice(index, index + BATCH_SIZE);
      const batchResults = await fetchBatch(batch);
      Object.assign(results, batchResults);

      if (index + BATCH_SIZE < uniqueIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from AniList" },
      { status: 500 },
    );
  }
}
