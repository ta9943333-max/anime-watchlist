"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AniListMediaCard } from "@/components/anilist/AniListMediaCard";
import { SkeletonCardGrid } from "@/components/ui/SkeletonCard";
import { searchAnimeClient } from "@/lib/anilist/client-api";
import type { AnilistListMedia, AnilistMediaListEntry } from "@/lib/anilist/types";
import { pickMediaTitle } from "@/lib/anilist/types";

const CURRENT_YEAR = new Date().getFullYear();

export function AniListSearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [seasonYear, setSeasonYear] = useState(CURRENT_YEAR);
  const [results, setResults] = useState<AnilistListMedia[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchAnimeClient({
        search: debounced || undefined,
        page: 1,
        perPage: 50,
        seasonYear: debounced ? undefined : seasonYear,
      });
      const page = data.Page as {
        media: AnilistListMedia[];
      };
      setResults(page?.media ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, seasonYear]);

  useEffect(() => {
    void search();
  }, [search]);

  const entries: AnilistMediaListEntry[] = results.map((media) => ({
    id: media.id,
    mediaId: media.id,
    status: null,
    score: null,
    progress: null,
    repeat: null,
    notes: null,
    startedAt: null,
    completedAt: null,
    media,
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Search Anime</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime…"
          className="min-w-[240px] flex-1 rounded border border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground))] px-4 py-2.5 text-sm text-white"
        />
        {!debounced && (
          <select
            value={seasonYear}
            onChange={(e) => setSeasonYear(Number(e.target.value))}
            className="rounded border border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground))] px-3 py-2 text-sm text-white"
          >
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((year) => (
              <option key={year} value={year}>
                Season {year}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-sm text-[rgb(var(--color-text-light))]">
        {debounced
          ? `Results for “${debounced}”`
          : `Popular anime from ${seasonYear} (live AniList)`}
      </p>

      {loading ? (
        <SkeletonCardGrid count={12} />
      ) : (
        <div className="library-grid">
          {entries.map((entry) => (
            <AniListMediaCard key={entry.media.id} entry={entry} />
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <p className="py-12 text-center text-[rgb(var(--color-text-light))]">
          No results.
        </p>
      )}

      <p className="text-xs text-[rgb(var(--color-text-lighter))]">
        Tip: Open any title to add it to your list when logged in.{" "}
        <Link href="/group" className="text-[rgb(var(--color-primary))]">
          Group watchlist
        </Link>
      </p>
    </div>
  );
}
