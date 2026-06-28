"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Library,
  Loader2,
  Search,
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
  animeEntryToDiscoverItem,
} from "@/lib/mal/discover-utils";
import {
  fetchMalSeason,
  searchMalAnime,
  type DiscoverItem,
} from "@/lib/mal/jikan";
import { getCountdownTarget, isCurrentlyAiring, isTrulyUpcoming } from "@/lib/mal/release-date";
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
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
};

type DiscoverView = "search" | "airing" | "upcoming" | "my-list";

type StatusFilter = "all" | AnimeStatus;

const VIEW_META: Record<
  DiscoverView,
  { label: string; title: string; description: string; icon: typeof Search }
> = {
  search: {
    label: "Search",
    title: "Search all anime",
    description:
      "Search any anime on MyAnimeList — add to your watchlist or set Planning / Watching directly.",
    icon: Search,
  },
  airing: {
    label: "Airing",
    title: "Currently airing",
    description:
      "Shows running right now with live countdown to the next episode (via AniList — e.g. Mushoku Tensei EP2 when EP1 is out).",
    icon: Tv,
  },
  upcoming: {
    label: "Upcoming",
    title: "Upcoming anime",
    description:
      "Not yet aired or premiering soon. Search within upcoming titles below.",
    icon: CalendarClock,
  },
  "my-list": {
    label: "My List",
    title: "Your watchlist",
    description:
      "All anime in your shared list — filter by Planning, Watching, Completed and more.",
    icon: Library,
  },
};

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

async function enrichItems(items: DiscoverItem[]): Promise<DiscoverItem[]> {
  const malIds = items.map((item) => item.malId).filter((id) => id > 0);
  if (malIds.length === 0) return items;

  const airingMap = await fetchAnilistNextEpisodes(malIds);
  return mergeAnilistAiring(items, airingMap);
}

export function MalDiscover({
  animeList,
  currentUser,
  onAdd,
  onSetMyStatus,
}: MalDiscoverProps) {
  const [view, setView] = useState<DiscoverView>("airing");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<DiscoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        if (view === "my-list") {
          let items = animeList.map((anime) =>
            animeEntryToDiscoverItem(anime, currentUser),
          );
          items = await enrichItems(items);
          if (!cancelled) setResults(items);
          return;
        }

        if (view === "search") {
          if (debouncedQuery.length < 2) {
            if (!cancelled) {
              setResults([]);
              setIsLoading(false);
            }
            return;
          }
          const found = await searchMalAnime(debouncedQuery);
          let items: DiscoverItem[] = found.map((item) => {
            const inList = watchlistByMalId.get(item.malId);
            return {
              ...item,
              watchlistId: inList?.id,
              myStatus: inList
                ? getMemberStatus(inList.memberStatuses, currentUser)
                : "none",
            };
          });
          items = await enrichItems(items);
          if (!cancelled) setResults(items);
          return;
        }

        const seasonFilter = view === "airing" ? "now" : "upcoming";
        const seasonItems = await fetchMalSeason(seasonFilter);

        let items: DiscoverItem[] = seasonItems
          .filter((item) =>
            view === "airing"
              ? item.malStatus === "Currently Airing"
              : item.malStatus === "Not yet aired",
          )
          .map((item) => {
            const inList = watchlistByMalId.get(item.malId);
            return {
              ...item,
              watchlistId: inList?.id,
              myStatus: inList
                ? getMemberStatus(inList.memberStatuses, currentUser)
                : "none",
            };
          });

        items = await enrichItems(items);

        if (view === "airing") {
          items = items.filter((item) =>
            isCurrentlyAiring(releaseFieldsFromAnime(item)),
          );
        }

        if (view === "upcoming") {
          items = items.filter((item) =>
            isTrulyUpcoming(releaseFieldsFromAnime(item)),
          );
        }

        if (!cancelled) setResults(items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [view, debouncedQuery, animeList, currentUser, watchlistByMalId]);

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

    return sortByCountdown(list);
  }, [results, genreFilter, statusFilter, searchQuery, view]);

  async function handleAdd(item: DiscoverItem) {
    setAddingId(item.malId);
    try {
      await onAdd(addPayloadFromDiscoverItem(item));
    } finally {
      setAddingId(null);
    }
  }

  const meta = VIEW_META[view];
  const showSearchHint = view === "search" && debouncedQuery.length < 2;

  return (
    <section className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-bold text-white">{meta.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          {meta.description}
        </p>
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
                setGenreFilter(null);
                setStatusFilter("all");
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

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {filteredResults.length} titles
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      ) : showSearchHint ? (
        <p className="py-24 text-center text-slate-500">
          Type at least 2 characters to search all anime on MyAnimeList.
        </p>
      ) : filteredResults.length === 0 ? (
        <p className="py-24 text-center text-slate-500">
          No anime found for this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredResults.map((result) => {
            const inList = watchlistByMalId.get(result.malId);
            const item: DiscoverItem = {
              ...result,
              watchlistId: inList?.id ?? result.watchlistId,
              myStatus: inList
                ? getMemberStatus(inList.memberStatuses, currentUser)
                : result.myStatus ?? "none",
              title: inList ? getDisplayTitle(inList) : result.title,
            };

            return (
              <DiscoverAnimeCard
                key={`${result.malId}-${result.watchlistId ?? "new"}`}
                anime={item}
                alreadyAdded={Boolean(inList ?? result.watchlistId)}
                isAdding={addingId === result.malId}
                onAdd={() => void handleAdd(result)}
                onSetMyStatus={onSetMyStatus}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
