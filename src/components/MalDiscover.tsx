"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Tv } from "lucide-react";
import { DiscoverAnimeCard } from "@/components/DiscoverAnimeCard";
import { fetchMalSeason, type MalSearchResult } from "@/lib/mal/jikan";
import { getCountdownTarget } from "@/lib/mal/release-date";
import { releaseFieldsFromAnime } from "@/components/AnimeReleaseBadge";
import type { AddAnimePayload, AnimeEntry } from "@/lib/types";

type MalDiscoverProps = {
  animeList: AnimeEntry[];
  onAdd: (payload: AddAnimePayload) => Promise<void>;
};

type DiscoverTab = "now" | "upcoming";

const TAB_LABELS: Record<DiscoverTab, string> = {
  upcoming: "Upcoming Anime",
  now: "This Season",
};

function sortByCountdown(items: MalSearchResult[]): MalSearchResult[] {
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

export function MalDiscover({ animeList, onAdd }: MalDiscoverProps) {
  const [tab, setTab] = useState<DiscoverTab>("upcoming");
  const [results, setResults] = useState<MalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  const existingMalIds = useMemo(
    () => new Set(animeList.map((anime) => anime.malId).filter(Boolean)),
    [animeList],
  );

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
    const filtered = genreFilter
      ? results.filter((result) =>
          result.genres.some(
            (genre) => genre.toLowerCase() === genreFilter.toLowerCase(),
          ),
        )
      : results;
    return sortByCountdown(filtered);
  }, [results, genreFilter]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        setIsLoading(true);
        setGenreFilter(null);
      }
    });

    void fetchMalSeason(tab)
      .then((items) => {
        if (!cancelled) setResults(items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function handleAdd(result: MalSearchResult) {
    setAddingId(result.malId);
    try {
      await onAdd({
        title: result.title,
        titleEnglish: result.titleEnglish,
        seriesKey: result.seriesKey,
        malStatus: result.malStatus,
        malId: result.malId,
        episodes: result.episodes,
        episodeDurationMin: result.episodeDurationMin,
        totalDurationMin: result.totalDurationMin,
        genres: result.genres,
        airedFrom: result.airedFrom,
        airedTo: result.airedTo,
        broadcastDay: result.broadcastDay,
        broadcastTime: result.broadcastTime,
        malSeason: result.malSeason,
        malYear: result.malYear,
      });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-2xl font-bold text-white">{TAB_LABELS[tab]}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Browse anime from MyAnimeList with release dates and live countdowns —
          similar to LiveChart. Add any title to your shared watchlist with one
          click.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition ${
            tab === "upcoming"
              ? "border-sky-500/50 bg-sky-600/15 text-sky-200"
              : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setTab("now")}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition ${
            tab === "now"
              ? "border-sky-500/50 bg-sky-600/15 text-sky-200"
              : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white"
          }`}
        >
          <Tv className="h-4 w-4" />
          This Season
        </button>

        <span className="hidden h-6 w-px bg-slate-700 sm:block" />

        <span className="text-xs uppercase tracking-wide text-slate-500">
          {filteredResults.length} titles
        </span>
      </div>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGenreFilter(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              genreFilter === null
                ? "bg-sky-600 text-white"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white"
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
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading from MyAnimeList…
        </div>
      ) : filteredResults.length === 0 ? (
        <p className="py-24 text-center text-slate-500">
          No anime found for this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredResults.map((result) => (
            <DiscoverAnimeCard
              key={result.malId}
              anime={result}
              alreadyAdded={existingMalIds.has(result.malId)}
              isAdding={addingId === result.malId}
              onAdd={() => void handleAdd(result)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
