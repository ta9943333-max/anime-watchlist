"use client";

import { MUTATION_BATCH_SIZE } from "@/lib/anilist/config";
import type { MediaListStatus } from "@/lib/anilist/types";

type GraphqlPayload = {
  query: string;
  variables?: Record<string, unknown>;
};

type SaveEntryInput = {
  id?: number;
  mediaId: number;
  status?: MediaListStatus;
  score?: number | null;
  progress?: number;
  repeat?: number;
  notes?: string | null;
};

const mutationQueue: SaveEntryInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

async function graphqlClient<T>(payload: GraphqlPayload): Promise<T> {
  const response = await fetch("/api/anilist/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
    error?: string;
  };
  if (!response.ok || body.errors?.length) {
    throw new Error(
      body.errors?.[0]?.message ?? body.error ?? "GraphQL request failed",
    );
  }
  if (!body.data) throw new Error("Empty GraphQL response");
  return body.data;
}

export async function fetchViewerClient() {
  const { VIEWER_QUERY } = await import("@/lib/anilist/queries");
  return graphqlClient<{ Viewer: unknown }>({ query: VIEWER_QUERY });
}

export async function fetchMediaListCollectionClient(
  userName: string,
  status?: MediaListStatus,
) {
  const { MEDIA_LIST_COLLECTION_QUERY } = await import("@/lib/anilist/queries");
  return graphqlClient<{ MediaListCollection: unknown }>({
    query: MEDIA_LIST_COLLECTION_QUERY,
    variables: { userName, type: "ANIME", status: status ?? undefined },
  });
}

export async function fetchMediaDetailClient(id: number, userName?: string) {
  const { MEDIA_DETAIL_QUERY } = await import("@/lib/anilist/queries");
  return graphqlClient<{ Media: unknown }>({
    query: MEDIA_DETAIL_QUERY,
    variables: { id, userName: userName ?? undefined },
  });
}

export async function searchAnimeClient(variables: Record<string, unknown>) {
  const { SEARCH_ANIME_QUERY } = await import("@/lib/anilist/queries");
  return graphqlClient<{ Page: unknown }>({
    query: SEARCH_ANIME_QUERY,
    variables,
  });
}

async function flushMutationQueue() {
  if (flushing || mutationQueue.length === 0) return;
  flushing = true;
  const { SAVE_MEDIA_LIST_ENTRY_MUTATION } = await import(
    "@/lib/anilist/queries"
  );

  while (mutationQueue.length > 0) {
    const batch = mutationQueue.splice(0, MUTATION_BATCH_SIZE);
    for (const entry of batch) {
      try {
        await graphqlClient({
          query: SAVE_MEDIA_LIST_ENTRY_MUTATION,
          variables: entry,
        });
      } catch {
        mutationQueue.unshift(entry);
        break;
      }
    }
    if (mutationQueue.length > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  flushing = false;
}

export function queueSaveMediaListEntry(input: SaveEntryInput): Promise<void> {
  return new Promise((resolve, reject) => {
    mutationQueue.push(input);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushMutationQueue().then(resolve).catch(reject);
    }, 200);
  });
}

export async function saveMediaListEntryNow(input: SaveEntryInput) {
  const { SAVE_MEDIA_LIST_ENTRY_MUTATION } = await import(
    "@/lib/anilist/queries"
  );
  return graphqlClient({
    query: SAVE_MEDIA_LIST_ENTRY_MUTATION,
    variables: input,
  });
}
