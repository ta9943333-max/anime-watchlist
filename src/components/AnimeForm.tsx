"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { searchMalAnime, type MalSearchResult } from "@/lib/mal/jikan";
import type { AddAnimePayload } from "@/lib/types";

type AnimeFormProps = {
  onAdd: (payload: AddAnimePayload) => void;
  folderId?: string | null;
  placeholder?: string;
  buttonLabel?: string;
};

function formatDuration(result: MalSearchResult): string {
  if (result.totalDurationMin) {
    const hours = Math.round((result.totalDurationMin / 60) * 10) / 10;
    return `${hours}h total`;
  }
  if (result.episodes) {
    return `${result.episodes} eps`;
  }
  return "Unknown length";
}

export function AnimeForm({
  onAdd,
  folderId = null,
  placeholder = "Search or add anime …",
  buttonLabel = "Add",
}: AnimeFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();

    const timer = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      void searchMalAnime(trimmed)
        .then((items) => {
          setResults(items);
          setShowResults(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submitPayload(payload: AddAnimePayload) {
    onAdd(payload);
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    submitPayload({ title: trimmed, folderId });
  }

  function handleSelectResult(result: MalSearchResult) {
    submitPayload({
      title: result.title,
      titleEnglish: result.titleEnglish,
      seriesKey: result.seriesKey,
      malStatus: result.malStatus,
      folderId,
      malId: result.malId,
      episodes: result.episodes,
      episodeDurationMin: result.episodeDurationMin,
      totalDurationMin: result.totalDurationMin,
      genres: result.genres,
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-10 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-400" />
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {buttonLabel}
        </button>
      </form>

      {showResults && results.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
          {results.map((result) => (
            <li key={result.malId}>
              <button
                type="button"
                onClick={() => handleSelectResult(result)}
                className="flex w-full items-start gap-3 border-b border-slate-800/80 px-4 py-3 text-left transition last:border-b-0 hover:bg-violet-600/10"
              >
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 shrink-0 rounded bg-slate-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {result.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDuration(result)}
                    {result.genres.length > 0 &&
                      ` · ${result.genres.slice(0, 3).join(", ")}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
