"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Plus, Sparkles, Tv } from "lucide-react";
import { fetchMalSeason, type MalSearchResult } from "@/lib/mal/jikan";
import type { AddAnimePayload, AnimeEntry } from "@/lib/types";

type MalDiscoverProps = {
  animeList: AnimeEntry[];
  onAdd: (payload: AddAnimePayload) => Promise<void>;
};

type DiscoverTab = "now" | "upcoming";

function formatDuration(result: MalSearchResult): string {
  if (result.totalDurationMin) {
    const hours = Math.round((result.totalDurationMin / 60) * 10) / 10;
    return `${hours}h`;
  }
  if (result.episodes) {
    return `${result.episodes} eps`;
  }
  return "TBA";
}

function statusLabel(status: string | null): string {
  if (!status) return "";
  return status.replace(/_/g, " ");
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
    if (!genreFilter) return results;
    return results.filter((result) =>
      result.genres.some(
        (genre) => genre.toLowerCase() === genreFilter.toLowerCase(),
      ),
    );
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
      });
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Discover Anime</h2>
        <p className="mt-1 text-sm text-slate-400">
          Current and upcoming anime from MyAnimeList — add with one click. New
          seasons are merged automatically (e.g. Code Geass S1 + S2).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            tab === "upcoming"
              ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
              : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setTab("now")}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            tab === "now"
              ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
              : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
          }`}
        >
          <Tv className="h-4 w-4" />
          This Season
        </button>
      </div>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGenreFilter(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              genreFilter === null
                ? "bg-pink-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
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
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                genreFilter === genre
                  ? "bg-pink-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading from MyAnimeList…
        </div>
      ) : filteredResults.length === 0 ? (
        <p className="py-16 text-center text-slate-500">
          No anime found for this filter.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredResults.map((result) => {
            const alreadyAdded = existingMalIds.has(result.malId);
            const isAdding = addingId === result.malId;

            return (
              <div
                key={result.malId}
                className="flex gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-4"
              >
                {result.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium text-white">
                    {result.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDuration(result)}
                    {result.malStatus && ` · ${statusLabel(result.malStatus)}`}
                  </p>
                  {result.genres.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-xs text-pink-300/80">
                      {result.genres.slice(0, 4).join(", ")}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={alreadyAdded || isAdding}
                    onClick={() => void handleAdd(result)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {alreadyAdded ? "In list" : "Add to list"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
