import { rankSearchResults } from "@/lib/mal/search-rank";
import type { DiscoverItem } from "@/lib/mal/jikan";

export type CatalogPageInfo = {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
};

export type AnilistCatalogState = {
  items: DiscoverItem[];
  status: "idle" | "loading" | "ready" | "error";
  loadedPages: number;
  totalPages: number | null;
  totalItems: number | null;
  error: string | null;
};

const PAGE_DELAY_MS = 500;

let state: AnilistCatalogState = {
  items: [],
  status: "idle",
  loadedPages: 0,
  totalPages: null,
  totalItems: null,
  error: null,
};

let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<AnilistCatalogState>) {
  state = { ...state, ...patch };
  notify();
}

function dedupeByAnilistId(items: DiscoverItem[]): DiscoverItem[] {
  const seen = new Map<number, DiscoverItem>();
  for (const item of items) {
    const key = item.anilistId ?? item.malId;
    if (key && !seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCatalogPage(page: number) {
  const response = await fetch(`/api/anilist/catalog?page=${page}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Catalog page ${page} failed`);
  }
  return (await response.json()) as {
    items: DiscoverItem[];
    pageInfo: CatalogPageInfo;
  };
}

async function loadAllPages() {
  setState({ status: "loading", error: null, items: [], loadedPages: 0 });

  const collected: DiscoverItem[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const { items, pageInfo } = await fetchCatalogPage(page);
    collected.push(...items);

    const deduped = dedupeByAnilistId(collected);
    setState({
      items: deduped,
      loadedPages: page,
      totalPages: pageInfo.lastPage,
      totalItems: pageInfo.total,
    });

    hasNextPage = pageInfo.hasNextPage;
    page += 1;

    if (hasNextPage) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  setState({
    items: dedupeByAnilistId(collected),
    status: "ready",
    loadedPages: page - 1,
  });
}

export function getAnilistCatalogState(): AnilistCatalogState {
  return state;
}

export function subscribeAnilistCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureAnilistCatalogLoaded(): Promise<void> {
  if (state.status === "ready") {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = loadAllPages()
    .catch((err: unknown) => {
      setState({
        status: "error",
        error:
          err instanceof Error ? err.message : "AniList catalog load failed",
      });
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function pickRandomCatalogItem(): DiscoverItem | null {
  if (state.items.length === 0) return null;
  const index = Math.floor(Math.random() * state.items.length);
  return state.items[index] ?? null;
}

export function searchCatalogItems(
  query: string,
  limit = 50,
): DiscoverItem[] {
  const trimmed = query.trim();
  if (trimmed.length < 2 || state.items.length === 0) return [];

  return rankSearchResults(trimmed, state.items).slice(0, limit);
}
