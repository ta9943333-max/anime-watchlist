"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Star } from "lucide-react";
import { releaseFieldsFromAnime } from "@/components/AnimeReleaseBadge";
import {
  formatAnimeRelease,
  formatCountdown,
  getCountdownTarget,
} from "@/lib/mal/release-date";
import type { MalSearchResult } from "@/lib/mal/jikan";

type DiscoverAnimeCardProps = {
  anime: MalSearchResult;
  alreadyAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
};

function formatEpisodeLine(anime: MalSearchResult): string {
  const epCount = anime.episodes ? String(anime.episodes) : "?";
  const epLength = anime.episodeDurationMin
    ? `${anime.episodeDurationMin}m`
    : "?m";
  return `${epCount} eps × ${epLength}`;
}

export function DiscoverAnimeCard({
  anime,
  alreadyAdded,
  isAdding,
  onAdd,
}: DiscoverAnimeCardProps) {
  const releaseInfo = useMemo(() => releaseFieldsFromAnime(anime), [anime]);
  const releaseLabel = formatAnimeRelease(releaseInfo);
  const countdownTarget = useMemo(
    () => getCountdownTarget(releaseInfo),
    [releaseInfo],
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!countdownTarget) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownTarget]);

  const countdown = countdownTarget
    ? formatCountdown(countdownTarget.date, new Date(now))
    : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-700/60 bg-[#1a1d24] shadow-lg shadow-black/20 transition hover:border-slate-600/80">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:gap-8">
        <div className="relative mx-auto w-[148px] shrink-0 sm:mx-0">
          {countdownTarget && countdown && (
            <div className="absolute inset-x-0 top-0 z-10 bg-black/85 px-2 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {countdownTarget.label}
              </p>
              <p className="mt-0.5 font-mono text-xs font-bold leading-tight text-amber-300">
                {countdown}
              </p>
            </div>
          )}

          {anime.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anime.imageUrl}
              alt=""
              className="aspect-[2/3] w-full rounded-lg object-cover shadow-md"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-slate-800">
              <Sparkles className="h-8 w-8 text-violet-400" />
            </div>
          )}

          {anime.score && anime.score > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-xs font-semibold text-amber-300">
              <Star className="h-3 w-3 fill-amber-300" />
              {anime.score.toFixed(2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-semibold leading-snug text-sky-400">
              {anime.title}
            </h3>
            {anime.genres.length > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {anime.genres.join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {anime.studios.length > 0 && (
              <p className="text-slate-300">
                <span className="text-slate-500">Studio · </span>
                {anime.studios.join(", ")}
              </p>
            )}

            {releaseLabel && (
              <p className="font-medium text-slate-200">{releaseLabel}</p>
            )}

            <p className="text-slate-400">{formatEpisodeLine(anime)}</p>

            {anime.broadcastDay && anime.broadcastTime && (
              <p className="text-slate-500">
                {anime.broadcastDay}s {anime.broadcastTime} JST
              </p>
            )}
          </div>

          {anime.synopsis && (
            <p className="line-clamp-4 text-sm leading-7 text-slate-400">
              {anime.synopsis}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={alreadyAdded || isAdding}
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/50 bg-violet-600/20 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-600/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {alreadyAdded ? "In list" : "Add to list"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
