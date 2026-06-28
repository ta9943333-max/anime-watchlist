"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Dices,
  Globe2,
  Loader2,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import { DiscoverAnimeCard } from "@/components/DiscoverAnimeCard";
import { ANIME_CARD_GRID } from "@/components/AnimeLiveChartCard";
import { releaseFieldsFromAnime } from "@/components/AnimeReleaseBadge";
import {
  fetchAnilistNextEpisodes,
  mergeAnilistAiring,
} from "@/lib/anilist/client";
import {
  addPayloadFromDiscoverItem,
} from "@/lib/mal/discover-utils";
import {
  loadDiscoverStatuses,
  setDiscoverEpisodesWatched,
  setDiscoverStatus,
  type DiscoverStatuses,
} from "@/lib/discover-status";
import {
  pickRandomCatalogItem,
  searchCatalogItems,
} from "@/lib/anilist/catalog-store";
import { useAnilistCatalog } from "@/lib/anilist/use-anilist-catalog";
import {
  fetchMalTop,
  hydrateDiscoverImages,
  searchMalAnime,
  type DiscoverItem,
} from "@/lib/mal/jikan";
import { rankSearchResults } from "@/lib/mal/search-rank";
import {
  getCountdownTarget,
  isCurrentlyAiring,
  isTrulyUpcoming,
} from "@/lib/mal/release-date";
import { getDisplayTitle, type AnimeEntry } from "@/lib/types";
import {
  STATUS_OPTIONS,
  getMemberStatus,
  getMemberEpisodesWatched,
  getMemberRewatchCount,
  statusShowsEpisodeProgress,
  type AnimeStatus,
} from "@/lib/statuses";
import type { AddAnimePayload } from "@/lib/types";

type MalDiscoverProps = {
  animeList: AnimeEntry[];
  currentUser: string;
  onAdd: (payload: AddAnimePayload) => Promise<void>;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched: (animeId: string, episodesWatched: number) => void;
  onSetRewatchCount: (animeId: string, rewatchCount: number) => void;
};

type DiscoverView = "pick" | "search" | "all" | "airing" | "upcoming";
type PickMode = "season" | "year" | "lucky";
type StatusFilter = "all" | AnimeStatus;

type ResultState = {
  view: DiscoverView;
  items: DiscoverItem[];
};

const VIEW_META: Record<
  DiscoverView,
  { label: string; title: string; description: string; icon: typeof Search }
> = {
  pick: {
    label: "What to watch",
    title: "What to watch",
    description:
      "Popular picks this season or year — or hit Feeling lucky for a random anime to start tonight.",
    icon: Clapperboard,
  },
  search: {
    label: "Search",
    title: "Search all anime",
    description:
      "Durchsucht den kompletten AniList-Katalog und MyAnimeList — bis zu 200 Treffer.",
    icon: Search,
  },
  all: {
    label: "All Anime",
    title: "All anime on AniList",
    description:
      "Der komplette AniList-Katalog (~20.000 Anime) — einmal laden, lokal cachen, blitzschnell filtern.",
    icon: Globe2,
  },
  airing: {
    label: "Airing",
    title: "Currently airing",
    description:
      "All currently releasing anime from the cached AniList catalog with live countdown.",
    icon: Tv,
  },
  upcoming: {
    label: "Upcoming",
    title: "Upcoming anime",
    description:
      "Not yet aired or premiering soon. Filter upcoming titles below.",
    icon: CalendarClock,
  },
};

const PICK_MODE_META: Record<
  PickMode,
  { label: string; description: string }
> = {
  season: {
    label: "This season",
    description: "Top-rated anime airing this season.",
  },
  year: {
    label: "This year",
    description: "Best anime from all seasons this year.",
  },
  lucky: {
    label: "Feeling lucky",
    description:
      "Random pick from the full cached AniList catalog — every roll uses the complete list.",
  },
};

const CATALOG_PAGE_SIZE = 36;

type CatalogSort = "score" | "title" | "airdate";

function discoverItemKey(item: DiscoverItem): string {
  return String(item.anilistId ?? item.malId);
}

function CatalogProgress({
  loadedPages,
  totalPages,
  totalItems,
  loadedCount,
}: {
  loadedPages: number;
  totalPages: number | null;
  totalItems: number | null;
  loadedCount: number;
}) {
  const progress =
    totalPages && totalPages > 0
      ? Math.min(100, Math.round((loadedPages / totalPages) * 100))
      : null;

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 px-4 py-4">
      <div className="flex items-center gap-3 text-sm text-sky-200">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <p>
          Loading AniList catalog…{" "}
          <span className="font-semibold text-white">
            {loadedCount.toLocaleString()}
          </span>
          {totalItems != null && (
            <>
              {" "}
              / {totalItems.toLocaleString()} anime
            </>
          )}
          {totalPages != null && (
            <span className="text-sky-300/80">
              {" "}
              · page {loadedPages} / {totalPages}
            </span>
          )}
        </p>
      </div>
      {progress != null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BrowsePagination({
  page,
  lastPage,
  totalLabel,
  isLoading,
  jumpInputId = "catalog-page-jump",
  onPageChange,
}: {
  page: number;
  lastPage: number;
  totalLabel?: string;
  isLoading: boolean;
  jumpInputId?: string;
  onPageChange: (page: number) => void;
}) {
  const [jumpValue, setJumpValue] = useState(String(page));

  useEffect(() => {
    setJumpValue(String(page));
  }, [page]);

  function goToPage(next: number) {
    onPageChange(Math.min(lastPage, Math.max(1, next)));
  }

  function applyJump() {
    const parsed = Number.parseInt(jumpValue, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setJumpValue(String(page));
    }
  }

  const canPrev = page > 1;
  const canNext = page < lastPage;

  return (
    <nav
      aria-label="Catalog pagination"
      className="flex flex-col items-stretch gap-4 rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center justify-center gap-1 sm:justify-start">
        <button
          type="button"
          aria-label="First page"
          disabled={!canPrev || isLoading}
          onClick={() => goToPage(1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Previous page"
          disabled={!canPrev || isLoading}
          onClick={() => goToPage(page - 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-bold tracking-tight text-white">
          Page {page.toLocaleString()}{" "}
          <span className="text-base font-normal text-slate-500">of</span>{" "}
          {lastPage.toLocaleString()}
        </p>
        {totalLabel && (
          <p className="text-xs text-slate-500">{totalLabel}</p>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor={jumpInputId} className="text-xs text-slate-500">
            Go to page
          </label>
          <input
            id={jumpInputId}
            type="number"
            min={1}
            max={lastPage}
            value={jumpValue}
            onChange={(event) => setJumpValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyJump();
            }}
            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-sky-500/60"
          />
          <button
            type="button"
            onClick={applyJump}
            disabled={isLoading}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-40"
          >
            Go
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 sm:justify-end">
        <button
          type="button"
          aria-label="Next page"
          disabled={!canNext || isLoading}
          onClick={() => goToPage(page + 1)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Last page"
          disabled={!canNext || isLoading}
          onClick={() => goToPage(lastPage)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

function paginateList<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function sortByCountdown(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) => {
    const targetA = getCountdownTarget(releaseFieldsFromAnime(a));
    const targetB = getCountdownTarget(releaseFieldsFromAnime(b));
    if (targetA && targetB) {
      return targetA.date.getTime() - targetB.date.getTime();
    }
    if (targetA) return -1;
    if (targetB) return 1;
    return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  });
}

function sortByScore(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function sortByTitle(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) =>
    a.title.localeCompare(b.title, "de", { sensitivity: "base" }),
  );
}

function sortByAirdate(items: DiscoverItem[]): DiscoverItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.airedFrom ? new Date(a.airedFrom).getTime() : 0;
    const bTime = b.airedFrom ? new Date(b.airedFrom).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title, "de", { sensitivity: "base" });
  });
}

function resolveUserStatus(
  item: DiscoverItem,
  byMal: Map<number, AnimeEntry>,
  byAnilist: Map<number, AnimeEntry>,
  currentUser: string,
  discoverStatuses: DiscoverStatuses,
): AnimeStatus {
  const inList =
    (item.malId > 0 ? byMal.get(item.malId) : undefined) ??
    (item.anilistId ? byAnilist.get(item.anilistId) : undefined);
  if (inList) {
    return getMemberStatus(inList.memberStatuses, currentUser);
  }
  const localKey =
    item.malId > 0
      ? `mal:${item.malId}`
      : item.anilistId
        ? `anilist:${item.anilistId}`
        : null;
  if (localKey && discoverStatuses[localKey]) {
    return discoverStatuses[localKey].status;
  }
  return "none";
}

function dedupeByMalId(items: DiscoverItem[]): DiscoverItem[] {
  const seen = new Map<string, DiscoverItem>();
  for (const item of items) {
    const key =
      item.malId > 0
        ? `mal:${item.malId}`
        : item.anilistId
          ? `anilist:${item.anilistId}`
          : null;
    if (key && !seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function attachWatchlistMeta(
  items: DiscoverItem[],
  animeList: AnimeEntry[],
  currentUser: string,
  discoverStatuses: DiscoverStatuses = {},
): DiscoverItem[] {
  const byMalId = new Map<number, AnimeEntry>();
  const byAnilistId = new Map<number, AnimeEntry>();
  for (const anime of animeList) {
    if (anime.malId) byMalId.set(anime.malId, anime);
    if (anime.anilistId) byAnilistId.set(anime.anilistId, anime);
  }

  return items.map((item) => {
    const inList =
      (item.malId > 0 ? byMalId.get(item.malId) : undefined) ??
      (item.anilistId ? byAnilistId.get(item.anilistId) : undefined);
    const localKey =
      item.malId > 0
        ? `mal:${item.malId}`
        : item.anilistId
          ? `anilist:${item.anilistId}`
          : null;
    const local = localKey ? discoverStatuses[localKey] : null;
    const watchlistStatus = inList
      ? getMemberStatus(inList.memberStatuses, currentUser)
      : "none";
    const watchlistEpisodes = inList
      ? getMemberEpisodesWatched(inList.memberStatuses, currentUser)
      : null;

    return {
      ...item,
      watchlistId: inList?.id ?? item.watchlistId,
      myStatus:
        watchlistStatus !== "none"
          ? watchlistStatus
          : (local?.status ?? item.myStatus ?? "none"),
      myEpisodesWatched:
        watchlistStatus !== "none" && watchlistEpisodes != null
          ? watchlistEpisodes
          : (local?.episodesWatched ?? item.myEpisodesWatched),
      myRewatchCount: inList
        ? getMemberRewatchCount(inList.memberStatuses, currentUser)
        : item.myRewatchCount,
      title: inList ? getDisplayTitle(inList) : item.title,
    };
  });
}

async function enrichItems(items: DiscoverItem[]): Promise<DiscoverItem[]> {
  const malIds = items.map((item) => item.malId).filter((id) => id > 0);
  let enriched = items;

  if (malIds.length > 0) {
    const airingMap = await fetchAnilistNextEpisodes(malIds);
    enriched = mergeAnilistAiring(enriched, airingMap);
  }

  return hydrateDiscoverImages(enriched);
}

function getCurrentSeason(now = new Date()): { season: string; year: number } {
  const month = now.getMonth();
  const season =
    month <= 2 ? "Winter" : month <= 5 ? "Spring" : month <= 8 ? "Summer" : "Fall";
  return { season, year: now.getFullYear() };
}

function viewUsesCatalog(
  activeView: DiscoverView,
  activePickMode: PickMode,
): boolean {
  if (
    activeView === "all" ||
    activeView === "airing" ||
    activeView === "upcoming"
  ) {
    return true;
  }
  return activeView === "pick" && activePickMode !== "lucky";
}

export function MalDiscover({
  animeList,
  currentUser,
  onAdd,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
}: MalDiscoverProps) {
  const catalog = useAnilistCatalog();
  const [view, setView] = useState<DiscoverView>("pick");
  const [pickMode, setPickMode] = useState<PickMode>("season");
  const [luckyPick, setLuckyPick] = useState<DiscoverItem | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [resultState, setResultState] = useState<ResultState>({
    view: "pick",
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [catalogSort, setCatalogSort] = useState<CatalogSort>("score");
  const [hideFinished, setHideFinished] = useState(false);
  const [discoverStatuses, setDiscoverStatuses] = useState<DiscoverStatuses>(() =>
    loadDiscoverStatuses(currentUser),
  );
  const loadSeqRef = useRef(0);
  const fetchKeyRef = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDiscoverStatuses(loadDiscoverStatuses(currentUser));
  }, [currentUser, animeList]);

  const apiResults = useMemo(() => {
    if (resultState.view !== view) return [];
    return attachWatchlistMeta(
      resultState.items,
      animeList,
      currentUser,
      discoverStatuses,
    );
  }, [resultState, view, animeList, currentUser, discoverStatuses]);

  const watchlistLookup = useMemo(() => {
    const byMal = new Map<number, AnimeEntry>();
    const byAnilist = new Map<number, AnimeEntry>();
    for (const anime of animeList) {
      if (anime.malId) byMal.set(anime.malId, anime);
      if (anime.anilistId) byAnilist.set(anime.anilistId, anime);
    }
    return { byMal, byAnilist };
  }, [animeList]);

  const findInWatchlist = useCallback(
    (item: DiscoverItem): AnimeEntry | undefined =>
      (item.malId > 0 ? watchlistLookup.byMal.get(item.malId) : undefined) ??
      (item.anilistId
        ? watchlistLookup.byAnilist.get(item.anilistId)
        : undefined),
    [watchlistLookup],
  );

  const catalogBaseItems = useMemo(() => {
    let items = catalog.items;
    if (view === "airing") {
      items = items.filter((item) =>
        isCurrentlyAiring(releaseFieldsFromAnime(item)),
      );
    } else if (view === "upcoming") {
      items = items.filter((item) =>
        isTrulyUpcoming(releaseFieldsFromAnime(item)),
      );
    } else if (view === "pick" && pickMode === "season") {
      const { season, year } = getCurrentSeason();
      items = items.filter(
        (item) =>
          item.malYear === year &&
          (item.malSeason ?? "").toLowerCase() === season.toLowerCase(),
      );
    } else if (view === "pick" && pickMode === "year") {
      const { year } = getCurrentSeason();
      items = items.filter((item) => item.malYear === year);
    }
    return items;
  }, [catalog.items, view, pickMode]);

  const hasListFilters = Boolean(
    genreFilter ||
      statusFilter !== "all" ||
      hideFinished ||
      (searchQuery.trim() && view !== "search"),
  );

  const catalogFilteredItems = useMemo(() => {
    if (!viewUsesCatalog(view, pickMode)) return [];

    let list: DiscoverItem[] = catalogBaseItems;
    const { byMal, byAnilist } = watchlistLookup;

    if (genreFilter) {
      list = list.filter((result) =>
        result.genres.some(
          (genre) => genre.toLowerCase() === genreFilter.toLowerCase(),
        ),
      );
    }

    if (hideFinished) {
      list = list.filter((item) => {
        const status = resolveUserStatus(
          item,
          byMal,
          byAnilist,
          currentUser,
          discoverStatuses,
        );
        return status !== "completed" && status !== "rewatching";
      });
    }

    if (statusFilter !== "all") {
      list = list.filter(
        (item) =>
          resolveUserStatus(
            item,
            byMal,
            byAnilist,
            currentUser,
            discoverStatuses,
          ) === statusFilter,
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (query && view !== "search") {
      list = list.filter((result) =>
        result.title.toLowerCase().includes(query),
      );
    }

    if (view === "airing" || view === "upcoming") {
      return sortByCountdown(list);
    }

    if (view === "pick" && pickMode !== "lucky") {
      return sortByScore(list);
    }

    if (catalogSort === "title") return sortByTitle(list);
    if (catalogSort === "airdate") return sortByAirdate(list);
    return sortByScore(list);
  }, [
    catalogBaseItems,
    view,
    pickMode,
    genreFilter,
    statusFilter,
    hideFinished,
    searchQuery,
    catalogSort,
    watchlistLookup,
    currentUser,
    discoverStatuses,
  ]);

  const filteredBeforePage = useMemo(() => {
    if (viewUsesCatalog(view, pickMode)) {
      return catalogFilteredItems;
    }

    let list = apiResults;

    if (genreFilter) {
      list = list.filter((result) =>
        result.genres.some(
          (genre) => genre.toLowerCase() === genreFilter.toLowerCase(),
        ),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((result) => result.myStatus === statusFilter);
    }

    if (hideFinished) {
      list = list.filter(
        (result) =>
          result.myStatus !== "completed" && result.myStatus !== "rewatching",
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (query && view !== "search") {
      list = list.filter((result) =>
        result.title.toLowerCase().includes(query),
      );
    }

    if (view === "airing" || view === "upcoming") {
      return sortByCountdown(list);
    }

    if (view === "pick" && pickMode !== "lucky") {
      return sortByScore(list);
    }

    return list;
  }, [
    catalogFilteredItems,
    apiResults,
    view,
    pickMode,
    genreFilter,
    statusFilter,
    hideFinished,
    searchQuery,
  ]);

  const listPagination = useMemo(() => {
    if (!viewUsesCatalog(view, pickMode)) return null;

    const filteredCount = filteredBeforePage.length;
    const catalogTotal = catalog.totalItems ?? catalog.items.length;
    const itemTotal =
      view === "all" && !hasListFilters ? catalogTotal : filteredCount;
    const lastPage = Math.max(1, Math.ceil(itemTotal / CATALOG_PAGE_SIZE));

    const suffix =
      view === "all"
        ? "anime in catalog"
        : view === "airing"
          ? "currently airing"
          : view === "upcoming"
            ? "upcoming"
            : "anime";
    const labelTotal = view === "all" ? catalogTotal : filteredCount;

    return {
      lastPage,
      totalLabel: `${labelTotal.toLocaleString()} ${suffix}`,
    };
  }, [
    view,
    pickMode,
    filteredBeforePage.length,
    catalog.totalItems,
    catalog.items.length,
    hasListFilters,
  ]);

  const pageAwaitingData = useMemo(() => {
    if (view !== "all" || catalog.status === "ready") return false;
    if (hasListFilters) return false;
    const required = catalogPage * CATALOG_PAGE_SIZE;
    return catalog.items.length < required;
  }, [
    view,
    catalog.status,
    catalog.items.length,
    catalogPage,
    hasListFilters,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const rollLucky = useCallback(() => {
    const random = pickRandomCatalogItem();
    if (!random) {
      setLuckyPick(null);
      return;
    }
    setLuckyPick(
      attachWatchlistMeta([random], animeList, currentUser, discoverStatuses)[0] ??
        null,
    );
  }, [animeList, currentUser, catalog.items.length, discoverStatuses]);

  useEffect(() => {
    if (
      view === "pick" &&
      pickMode === "lucky" &&
      catalog.items.length > 0 &&
      !luckyPick
    ) {
      rollLucky();
    }
  }, [view, pickMode, catalog.items.length, luckyPick, rollLucky]);

  useEffect(() => {
    if (viewUsesCatalog(view, pickMode)) return;

    const activeView = view;
    const activePickMode = pickMode;
    const fetchKey = `${activeView}:${activePickMode}:${debouncedQuery}`;
    const hasCachedResults =
      fetchKeyRef.current === fetchKey && resultState.items.length > 0;
    fetchKeyRef.current = fetchKey;
    const seq = ++loadSeqRef.current;
    if (!hasCachedResults) {
      setResultState({ view: activeView, items: [] });
      setIsLoading(true);
    }
    if (activeView !== "pick" || activePickMode !== "lucky") {
      setLuckyPick(null);
    }

    async function load() {
      try {
        if (activeView === "search") {
          if (debouncedQuery.length >= 2) {
            const found = await searchMalAnime(debouncedQuery);
            const fromCatalog = searchCatalogItems(debouncedQuery, 500);
            let items = dedupeByMalId(
              rankSearchResults(debouncedQuery, [...fromCatalog, ...found]),
            ).slice(0, 200);
            items = await enrichItems(items);
            if (seq !== loadSeqRef.current) return;
            setResultState({
              view: activeView,
              items,
            });
            return;
          }

          const popular = await fetchMalTop("popular", 50);
          let items = dedupeByMalId(popular);
          items = await enrichItems(items);
          if (seq !== loadSeqRef.current) return;
          setResultState({
            view: activeView,
            items,
          });
          return;
        }

        if (activeView === "pick") {
          if (activePickMode === "lucky") {
            if (seq !== loadSeqRef.current) return;
            setResultState({ view: activeView, items: [] });
            return;
          }

          const topType = activePickMode === "year" ? "year" : "season";
          const topItems = await fetchMalTop(topType, 25);
          let items = dedupeByMalId(topItems);
          items = await enrichItems(items);
          if (seq !== loadSeqRef.current) return;
          setResultState({
            view: activeView,
            items,
          });
          return;
        }
      } catch {
        if (seq !== loadSeqRef.current) return;
        setResultState({ view: activeView, items: [] });
      } finally {
        if (seq === loadSeqRef.current) {
          setIsLoading(false);
        }
      }
    }

    void load();
  }, [view, pickMode, debouncedQuery]);

  useEffect(() => {
    if (!viewUsesCatalog(view, pickMode)) return;
    setIsLoading(catalog.items.length === 0 && catalog.status === "loading");
  }, [view, pickMode, catalog.items.length, catalog.status]);

  const sourceResults = viewUsesCatalog(view, pickMode)
    ? catalogBaseItems
    : apiResults;

  const genres = useMemo(() => {
    const set = new Set<string>();
    const sample = sourceResults.slice(0, 2500);
    for (const result of sample) {
      for (const genre of result.genres) {
        set.add(genre);
      }
    }
    return [...set].sort();
  }, [sourceResults]);

  const filteredResults = useMemo(() => {
    if (viewUsesCatalog(view, pickMode)) {
      const pageItems = paginateList(
        filteredBeforePage,
        catalogPage,
        CATALOG_PAGE_SIZE,
      );
      return attachWatchlistMeta(
        pageItems,
        animeList,
        currentUser,
        discoverStatuses,
      );
    }
    return filteredBeforePage;
  }, [
    filteredBeforePage,
    view,
    pickMode,
    catalogPage,
    animeList,
    currentUser,
    discoverStatuses,
  ]);

  const catalogIsLoading =
    catalog.status === "loading" || catalog.status === "idle";
  const showLucky = view === "pick" && pickMode === "lucky";
  const showCatalogProgress =
    catalogIsLoading && (viewUsesCatalog(view, pickMode) || showLucky);
  const listIsLoading = viewUsesCatalog(view, pickMode)
    ? (catalog.items.length === 0 && catalogIsLoading) || pageAwaitingData
    : isLoading && resultState.items.length === 0 && !showLucky;
  const showListPagination =
    viewUsesCatalog(view, pickMode) &&
    listPagination != null &&
    (catalog.totalItems != null || catalog.items.length > 0);

  useEffect(() => {
    if (listPagination && catalogPage > listPagination.lastPage) {
      setCatalogPage(listPagination.lastPage);
    }
  }, [listPagination, catalogPage]);

  async function handleAdd(item: DiscoverItem) {
    setAddingId(item.malId || item.anilistId || null);
    try {
      await onAdd(addPayloadFromDiscoverItem(item));
      setDiscoverStatuses(loadDiscoverStatuses(currentUser));
    } finally {
      setAddingId(null);
    }
  }

  const handlePersonalStatus = useCallback(
    (item: DiscoverItem, status: AnimeStatus) => {
      const episodes =
        statusShowsEpisodeProgress(status) && item.myEpisodesWatched != null
          ? item.myEpisodesWatched
          : statusShowsEpisodeProgress(status)
            ? 0
            : undefined;
      setDiscoverStatuses(
        setDiscoverStatus(
          currentUser,
          item.malId,
          item.anilistId,
          status,
          episodes,
        ),
      );
    },
    [currentUser],
  );

  const handlePersonalEpisodes = useCallback(
    (item: DiscoverItem, episodesWatched: number) => {
      setDiscoverStatuses(
        setDiscoverEpisodesWatched(
          currentUser,
          item.malId,
          item.anilistId,
          episodesWatched,
        ),
      );
    },
    [currentUser],
  );

  function renderDiscoverCard(result: DiscoverItem) {
    const inList = findInWatchlist(result);

    return (
      <DiscoverAnimeCard
        key={discoverItemKey(result)}
        anime={result}
        alreadyAdded={Boolean(inList ?? result.watchlistId)}
        isAdding={addingId === (result.malId || result.anilistId)}
        allowPersonalStatus={!showLucky}
        onAdd={() => void handleAdd(result)}
        onSetMyStatus={onSetMyStatus}
        onSetEpisodesWatched={onSetEpisodesWatched}
        onSetRewatchCount={onSetRewatchCount}
        onSetPersonalStatus={(status) => handlePersonalStatus(result, status)}
        onSetPersonalEpisodes={(episodes) =>
          handlePersonalEpisodes(result, episodes)
        }
      />
    );
  }

  const meta = VIEW_META[view];

  return (
    <section ref={sectionRef} className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          {meta.description}
        </p>
        {view !== "pick" && (
          <p className="mt-3 text-xs text-slate-500">
            Deine persönliche Liste findest du oben unter{" "}
            <span className="font-medium text-violet-300">Watchlist</span> — hier
            geht es nur ums Entdecken und Hinzufügen.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(VIEW_META) as DiscoverView[]).map((key) => {
          const { label, icon: Icon } = VIEW_META[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setView(key);
                setResultState({ view: key, items: [] });
                setIsLoading(true);
                setGenreFilter(null);
                setStatusFilter("all");
                setHideFinished(false);
                setCatalogPage(1);
                if (key !== "search") setSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                view === key
                  ? "border-sky-500/50 bg-sky-600/15 text-sky-200"
                  : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {view === "pick" && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pick your vibe
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PICK_MODE_META) as PickMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setPickMode(mode);
                  setResultState({ view: "pick", items: [] });
                  setCatalogPage(1);
                  if (mode === "lucky") setLuckyPick(null);
                  if (mode !== "lucky") setIsLoading(true);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  pickMode === mode
                    ? "bg-amber-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {PICK_MODE_META[mode].label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {PICK_MODE_META[pickMode].description}
          </p>
        </div>
      )}

      {!showLucky && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              view === "search"
                ? "Search any anime on MyAnimeList…"
                : "Filter current list…"
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3.5 pl-11 pr-4 text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
      )}

      {!showLucky && viewUsesCatalog(view, pickMode) && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Sortierung
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["score", "Bewertung"],
                ["title", "Titel"],
                ["airdate", "Startdatum"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCatalogSort(value);
                  setCatalogPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  catalogSort === value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showLucky && (
        <>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Mark Filter
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setHideFinished((value) => !value);
                  setCatalogPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  hideFinished
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                Abgeschlossene ausblenden
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Dein Status
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === "all"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              {STATUS_OPTIONS.filter((option) => option.value !== "none").map(
                (option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === option.value ? "all" : option.value,
                      )
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      statusFilter === option.value
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Genre
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGenreFilter(null)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    genreFilter === null
                      ? "bg-sky-600 text-white"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() =>
                      setGenreFilter(genre === genreFilter ? null : genre)
                    }
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      genreFilter === genre
                        ? "bg-sky-600 text-white"
                        : "bg-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showCatalogProgress && (
        <CatalogProgress
          loadedPages={catalog.loadedPages}
          totalPages={catalog.totalPages}
          totalItems={catalog.totalItems}
          loadedCount={catalog.items.length}
        />
      )}

      {catalog.status === "error" &&
        (viewUsesCatalog(view, pickMode) || showLucky) && (
          <p className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            AniList catalog failed: {catalog.error}
          </p>
        )}

      {view === "search" && debouncedQuery.length < 2 && !listIsLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Showing popular anime — type to search all of MyAnimeList.
        </div>
      )}

      {!showLucky && (
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {showListPagination && listPagination
            ? `${listPagination.totalLabel} · ${filteredResults.length} on this page`
            : `${filteredBeforePage.length} titles`}
        </p>
      )}

      {showListPagination && listPagination && !listIsLoading && (
        <BrowsePagination
          page={catalogPage}
          lastPage={listPagination.lastPage}
          totalLabel={listPagination.totalLabel}
          isLoading={listIsLoading}
          jumpInputId="catalog-page-jump-top"
          onPageChange={setCatalogPage}
        />
      )}

      {listIsLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          {pageAwaitingData ? (
            <p className="text-sm">
              Loading page {catalogPage}… ({catalog.items.length.toLocaleString()}{" "}
              anime cached so far)
            </p>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      ) : showLucky ? (
        catalog.items.length === 0 && catalogIsLoading ? (
          <p className="py-24 text-center text-slate-500">
            Waiting for AniList catalog…
          </p>
        ) : luckyPick ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-6 py-8 text-center">
              <Dices className="h-10 w-10 text-amber-400" />
              <div>
                <p className="text-lg font-semibold text-white">
                  Tonight&apos;s pick
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Random from{" "}
                  {(catalog.totalItems ?? catalog.items.length).toLocaleString()}{" "}
                  anime in the cached catalog
                </p>
              </div>
              <button
                type="button"
                disabled={catalog.items.length === 0}
                onClick={() => rollLucky()}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-600/20 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-600/35 disabled:opacity-50"
              >
                <Dices className="h-4 w-4" />
                Feeling lucky — roll again
              </button>
            </div>
            {renderDiscoverCard(luckyPick)}
          </div>
        ) : (
          <p className="py-24 text-center text-slate-500">
            Could not load anime for a random pick. Try again.
          </p>
        )
      ) : filteredResults.length === 0 && !pageAwaitingData ? (
        <p className="py-24 text-center text-slate-500">
          No anime found for this filter.
        </p>
      ) : (
        <div className={ANIME_CARD_GRID}>
          {filteredResults.map((result) => renderDiscoverCard(result))}
          {showListPagination && listPagination && (
            <BrowsePagination
              page={catalogPage}
              lastPage={listPagination.lastPage}
              totalLabel={listPagination.totalLabel}
              isLoading={listIsLoading}
              jumpInputId="catalog-page-jump-bottom"
              onPageChange={setCatalogPage}
            />
          )}
        </div>
      )}
    </section>
  );
}
