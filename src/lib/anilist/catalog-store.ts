import {
  isCatalogCacheFresh,
  readCatalogCache,
  writeCatalogCache,
  type CatalogCacheRecord,
} from "@/lib/anilist/catalog-indexeddb";
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

const PAGE_DELAY_MS = 200;
const PAGE_BATCH_SIZE = 5;

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

async function persistCatalog(
  collected: DiscoverItem[],
  loadedPages: number,
  totalPages: number,
  totalItems: number,
  complete: boolean,
) {
  const record: CatalogCacheRecord = {
    items: dedupeByAnilistId(collected),
    loadedPages,
    totalPages,
    totalItems,
    complete,
    updatedAt: new Date().toISOString(),
  };
  await writeCatalogCache(record);
}

async function loadAllPages(startPage = 1, initialItems: DiscoverItem[] = []) {
  let collected = [...initialItems];
  let page = startPage;
  let totalPages = state.totalPages ?? 0;
  let totalItems = state.totalItems ?? 0;

  setState({
    status: "loading",
    error: null,
    items: dedupeByAnilistId(collected),
    loadedPages: Math.max(0, startPage - 1),
  });

  if (page === 1 || totalPages === 0) {
    const first = await fetchCatalogPage(1);
    totalPages = first.pageInfo.lastPage;
    totalItems = first.pageInfo.total;

    if (page === 1) {
      collected = [...first.items];
      page = 2;
    }

    setState({
      items: dedupeByAnilistId(collected),
      loadedPages: page === 2 ? 1 : Math.max(0, startPage - 1),
      totalPages,
      totalItems,
    });
  }

  while (page <= totalPages) {
    const batchPages = Array.from(
      { length: Math.min(PAGE_BATCH_SIZE, totalPages - page + 1) },
      (_, index) => page + index,
    );

    const batchResults = await Promise.all(
      batchPages.map((batchPage) => fetchCatalogPage(batchPage)),
    );

    for (const result of batchResults) {
      collected.push(...result.items);
    }

    const lastLoadedPage = batchPages[batchPages.length - 1] ?? page;
    const deduped = dedupeByAnilistId(collected);
    const complete = lastLoadedPage >= totalPages;

    setState({
      items: deduped,
      loadedPages: lastLoadedPage,
      totalPages,
      totalItems,
      status: complete ? "ready" : "loading",
    });

    await persistCatalog(
      deduped,
      lastLoadedPage,
      totalPages,
      totalItems,
      complete,
    );

    page = lastLoadedPage + 1;

    if (!complete) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  setState({
    items: dedupeByAnilistId(collected),
    status: "ready",
    loadedPages: totalPages,
    totalPages,
    totalItems,
  });
}

async function hydrateFromCache(): Promise<"ready" | "loading" | "miss"> {
  const cached = await readCatalogCache();
  if (!cached) return "miss";

  setState({
    items: cached.items,
    loadedPages: cached.loadedPages,
    totalPages: cached.totalPages,
    totalItems: cached.totalItems,
    status: cached.complete && isCatalogCacheFresh(cached) ? "ready" : "loading",
    error: null,
  });

  if (cached.complete && isCatalogCacheFresh(cached)) {
    return "ready";
  }

  const resumePage = cached.loadedPages + 1;
  if (resumePage <= cached.totalPages) {
    await loadAllPages(resumePage, cached.items);
  } else {
    await loadAllPages(1);
  }

  return "loading";
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

  loadPromise = (async () => {
    try {
      if (state.status === "idle") {
        const cacheResult = await hydrateFromCache();
        if (cacheResult === "ready") {
          return;
        }
        if (cacheResult === "miss") {
          await loadAllPages(1);
        }
      } else if (state.status === "loading" && state.loadedPages > 0) {
        await loadAllPages(state.loadedPages + 1, state.items);
      } else {
        await loadAllPages(1);
      }
    } catch (err: unknown) {
      setState({
        status: "error",
        error:
          err instanceof Error ? err.message : "AniList catalog load failed",
      });
    }
  })().finally(() => {
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
  limit = 200,
): DiscoverItem[] {
  const trimmed = query.trim();
  if (trimmed.length < 2 || state.items.length === 0) return [];

  return rankSearchResults(trimmed, state.items).slice(0, limit);
}

export function getCatalogCountLabel(): string {
  const total = state.totalItems ?? state.items.length;
  const loaded = state.items.length;
  if (state.status === "ready") {
    return `${total.toLocaleString()} Anime`;
  }
  return `${loaded.toLocaleString()} / ${total.toLocaleString()} Anime geladen`;
}
