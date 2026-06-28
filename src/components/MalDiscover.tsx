"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Dices,
  Globe2,
  Loader2,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import { DiscoverAnimeCard } from "@/components/DiscoverAnimeCard";
import { releaseFieldsFromAnime } from "@/components/AnimeReleaseBadge";
import {
  fetchAnilistNextEpisodes,
  mergeAnilistAiring,
} from "@/lib/anilist/client";
import {
  addPayloadFromDiscoverItem,
} from "@/lib/mal/discover-utils";
import {
  fetchMalBrowse,
  fetchMalRandom,
  fetchMalSeason,
  fetchMalTop,
  hydrateDiscoverImages,
  searchMalAnime,
  type DiscoverItem,
  type MalPagination,
} from "@/lib/mal/jikan";
import {
  getCountdownTarget,
  isCurrentlyAiring,
  isTrulyUpcoming,
} from "@/lib/mal/release-date";
import { getDisplayTitle, type AnimeEntry } from "@/lib/types";
import {
  STATUS_OPTIONS,
  getMemberStatus,
  type AnimeStatus,
} from "@/lib/statuses";
import type { AddAnimePayload } from "@/lib/types";

type MalDiscoverProps = {
  animeList: AnimeEntry[];
  currentUser: string;
  onAdd: (payload: AddAnimePayload) => Promise<void>;
  onAddWithStatus: (
    payload: AddAnimePayload,
    status: AnimeStatus,
  ) => Promise<void>;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
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
      "Browse popular anime or search MyAnimeList — add to your watchlist or set a status directly.",
    icon: Search,
  },
  all: {
    label: "All Anime",
    title: "All anime on MyAnimeList",
    description:
      "Browse the full MAL catalog — 25 per page, sorted by popularity. Mark Completed or Watching to update your stats.",
    icon: Globe2,
  },
  airing: {
    label: "Airing",
    title: "Currently airing",
    description:
      "Shows running right now with live countdown to the next episode.",
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
      "One random anime from all of MyAnimeList — each roll picks from the entire catalog.",
  },
};

function BrowsePagination({
  pagination,
  page,
  isLoading,
  onPageChange,
}: {
  pagination: MalPagination;
  page: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = pagination.hasNextPage;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 sm:flex-row">
      <button
        type="button"
        disabled={!canPrev || isLoading}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <p className="text-center text-sm text-slate-400">
        Page{" "}
        <span className="font-semibold text-white">{pagination.currentPage}</span>{" "}
        of{" "}
        <span className="font-semibold text-white">
          {pagination.lastVisiblePage.toLocaleString()}
        </span>
        <span className="mx-2 text-slate-600">·</span>
        <span className="font-semibold text-sky-300">
          {pagination.total.toLocaleString()}
        </span>{" "}
        anime on MAL
      </p>

      <button
        type="button"
        disabled={!canNext || isLoading}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
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

function dedupeByMalId(items: DiscoverItem[]): DiscoverItem[] {
  const seen = new Map<number, DiscoverItem>();
  for (const item of items) {
    if (item.malId > 0 && !seen.has(item.malId)) {
      seen.set(item.malId, item);
    }
  }
  return [...seen.values()];
}

function attachWatchlistMeta(
  items: DiscoverItem[],
  animeList: AnimeEntry[],
  currentUser: string,
): DiscoverItem[] {
  const byMalId = new Map<number, AnimeEntry>();
  for (const anime of animeList) {
    if (anime.malId) byMalId.set(anime.malId, anime);
  }

  return items.map((item) => {
    const inList = byMalId.get(item.malId);
    return {
      ...item,
      watchlistId: inList?.id ?? item.watchlistId,
      myStatus: inList
        ? getMemberStatus(inList.memberStatuses, currentUser)
        : (item.myStatus ?? "none"),
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

export function MalDiscover({
  animeList,
  currentUser,
  onAdd,
  onAddWithStatus,
  onSetMyStatus,
}: MalDiscoverProps) {
  const [view, setView] = useState<DiscoverView>("pick");
  const [pickMode, setPickMode] = useState<PickMode>("season");
  const [luckyPick, setLuckyPick] = useState<DiscoverItem | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [allPage, setAllPage] = useState(1);
  const [browsePagination, setBrowsePagination] =
    useState<MalPagination | null>(null);
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
  const loadSeqRef = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);

  const results =
    resultState.view === view ? resultState.items : [];

  const watchlistByMalId = useMemo(() => {
    const map = new Map<number, AnimeEntry>();
    for (const anime of animeList) {
      if (anime.malId) map.set(anime.malId, anime);
    }
    return map;
  }, [animeList]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const rollLucky = useCallback(async () => {
    setIsRolling(true);
    try {
      const random = await fetchMalRandom();
      let items = await enrichItems([random]);
      items = attachWatchlistMeta(items, animeList, currentUser);
      setLuckyPick(items[0] ?? null);
    } catch {
      setLuckyPick(null);
    } finally {
      setIsRolling(false);
    }
  }, [animeList, currentUser]);

  useEffect(() => {
    const activeView = view;
    const activePickMode = pickMode;
    const activeAllPage = allPage;
    const seq = ++loadSeqRef.current;
    setResultState({ view: activeView, items: [] });
    setIsLoading(true);
    if (activeView !== "pick" || activePickMode !== "lucky") {
      setLuckyPick(null);
    }
    if (activeView !== "all") {
      setBrowsePagination(null);
    }

    async function load() {
      try {
        if (activeView === "search") {
          if (debouncedQuery.length >= 2) {
            const found = await searchMalAnime(debouncedQuery);
            let items = dedupeByMalId(found);
            items = await enrichItems(items);
            if (seq !== loadSeqRef.current) return;
            setResultState({
              view: activeView,
              items: attachWatchlistMeta(items, animeList, currentUser),
            });
            return;
          }

          const popular = await fetchMalTop("popular", 25);
          let items = dedupeByMalId(popular);
          items = await enrichItems(items);
          if (seq !== loadSeqRef.current) return;
          setResultState({
            view: activeView,
            items: attachWatchlistMeta(items, animeList, currentUser),
          });
          return;
        }

        if (activeView === "all") {
          const { results, pagination } = await fetchMalBrowse(activeAllPage);
          let items = dedupeByMalId(results);
          items = await enrichItems(items);
          if (seq !== loadSeqRef.current) return;
          setBrowsePagination(pagination);
          setResultState({
            view: activeView,
            items: attachWatchlistMeta(items, animeList, currentUser),
          });
          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (activeView === "pick") {
          if (activePickMode === "lucky") {
            const random = await fetchMalRandom();
            let items = await enrichItems([random]);
            items = attachWatchlistMeta(items, animeList, currentUser);
            if (seq !== loadSeqRef.current) return;
            setLuckyPick(items[0] ?? null);
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
            items: attachWatchlistMeta(items, animeList, currentUser),
          });
          return;
        }

        const seasonFilter = activeView === "airing" ? "now" : "upcoming";
        const seasonItems = await fetchMalSeason(seasonFilter);

        let items: DiscoverItem[] = seasonItems.filter((item) =>
          activeView === "airing"
            ? item.malStatus === "Currently Airing"
            : item.malStatus === "Not yet aired",
        );

        items = dedupeByMalId(items);
        items = await enrichItems(items);

        if (activeView === "airing") {
          items = items.filter((item) =>
            isCurrentlyAiring(releaseFieldsFromAnime(item)),
          );
        } else {
          items = items.filter((item) =>
            isTrulyUpcoming(releaseFieldsFromAnime(item)),
          );
        }

        if (seq !== loadSeqRef.current) return;
        setResultState({
          view: activeView,
          items: attachWatchlistMeta(items, animeList, currentUser),
        });
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
  }, [view, pickMode, debouncedQuery, animeList, currentUser, allPage]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const result of results) {
      for (const genre of result.genres) {
        set.add(genre);
      }
    }
    return [...set].sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    let list = results;

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

    const query = searchQuery.trim().toLowerCase();
    if (query && view !== "search") {
      list = list.filter((result) =>
        result.title.toLowerCase().includes(query),
      );
    }

    if (view === "pick" && pickMode !== "lucky") {
      return sortByScore(list);
    }

    if (view === "all") {
      return list;
    }

    return sortByCountdown(list);
  }, [results, genreFilter, statusFilter, searchQuery, view, pickMode]);

  async function handleAdd(item: DiscoverItem) {
    setAddingId(item.malId);
    try {
      await onAdd(addPayloadFromDiscoverItem(item));
    } finally {
      setAddingId(null);
    }
  }

  async function handleAddWithStatus(
    item: DiscoverItem,
    status: AnimeStatus,
  ) {
    setAddingId(item.malId);
    try {
      await onAddWithStatus(addPayloadFromDiscoverItem(item), status);
    } finally {
      setAddingId(null);
    }
  }

  function renderDiscoverCard(result: DiscoverItem) {
    const inList = watchlistByMalId.get(result.malId);
    const item: DiscoverItem = {
      ...result,
      watchlistId: inList?.id ?? result.watchlistId,
      myStatus: inList
        ? getMemberStatus(inList.memberStatuses, currentUser)
        : (result.myStatus ?? "none"),
      title: inList ? getDisplayTitle(inList) : result.title,
    };

    return (
      <DiscoverAnimeCard
        key={result.malId}
        anime={item}
        alreadyAdded={Boolean(inList ?? result.watchlistId)}
        isAdding={addingId === result.malId}
        onAdd={() => void handleAdd(result)}
        onAddWithStatus={(status) => void handleAddWithStatus(result, status)}
        allowQuickStatus={view === "all" || view === "search"}
        onSetMyStatus={onSetMyStatus}
      />
    );
  }

  const meta = VIEW_META[view];
  const showLucky = view === "pick" && pickMode === "lucky";

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
                if (key === "all") setAllPage(1);
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
                  setIsLoading(true);
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

      {!showLucky && (
        <>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Your status
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

      {view === "search" && debouncedQuery.length < 2 && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Showing popular anime — type to search all of MyAnimeList.
        </div>
      )}

      {!showLucky && (
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {view === "all" && browsePagination
            ? `${browsePagination.total.toLocaleString()} anime on MAL · showing ${filteredResults.length} on this page`
            : `${filteredResults.length} titles`}
        </p>
      )}

      {view === "all" && browsePagination && !isLoading && (
        <BrowsePagination
          pagination={browsePagination}
          page={allPage}
          isLoading={isLoading}
          onPageChange={setAllPage}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      ) : showLucky ? (
        luckyPick ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-6 py-8 text-center">
              <Dices className="h-10 w-10 text-amber-400" />
              <div>
                <p className="text-lg font-semibold text-white">
                  Tonight&apos;s pick
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Random from all of MyAnimeList — every roll is a new title
                </p>
              </div>
              <button
                type="button"
                disabled={isRolling}
                onClick={() => void rollLucky()}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-600/20 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-600/35 disabled:opacity-50"
              >
                {isRolling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Dices className="h-4 w-4" />
                )}
                Feeling lucky — roll again
              </button>
            </div>
            {isRolling ? (
              <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                Rolling…
              </div>
            ) : (
              renderDiscoverCard(luckyPick)
            )}
          </div>
        ) : (
          <p className="py-24 text-center text-slate-500">
            Could not load anime for a random pick. Try again.
          </p>
        )
      ) : filteredResults.length === 0 ? (
        <p className="py-24 text-center text-slate-500">
          No anime found for this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredResults.map((result) => renderDiscoverCard(result))}
          {view === "all" && browsePagination && (
            <BrowsePagination
              pagination={browsePagination}
              page={allPage}
              isLoading={isLoading}
              onPageChange={setAllPage}
            />
          )}
        </div>
      )}
    </section>
  );
}
