"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Sparkles, Star } from "lucide-react";
import { releaseFieldsFromAnime } from "@/components/AnimeReleaseBadge";
import type { AnimeReleaseFields } from "@/lib/mal/release-date";
import {
  formatAnimeRelease,
  formatCountdown,
  getCountdownTarget,
  NO_RELEASE_DATA,
} from "@/lib/mal/release-date";

export type AnimeLiveChartData = AnimeReleaseFields & {
  title: string;
  genres: string[];
  malId?: number | null;
  anilistId?: number | null;
  imageUrl?: string | null;
  studios?: string[];
  score?: number | null;
  episodes?: number | null;
  episodeDurationMin?: number | null;
  synopsis?: string | null;
};

export const ANIME_CARD_GRID =
  "grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";

type AnimeLiveChartCardProps = {
  anime: AnimeLiveChartData;
  headerRight?: ReactNode;
  actions?: ReactNode;
  footerExtra?: ReactNode;
  accentClassName?: string;
};

function formatEpisodeLine(anime: AnimeLiveChartData): string {
  const epCount = anime.episodes ? String(anime.episodes) : "?";
  const epLength = anime.episodeDurationMin
    ? `${anime.episodeDurationMin}m`
    : "?m";
  return `${epCount} eps × ${epLength}`;
}

function formatGenreLine(genres: string[]): string {
  return genres.join(" · ");
}

export function AnimeLiveChartCard({
  anime,
  headerRight,
  actions,
  footerExtra,
  accentClassName,
}: AnimeLiveChartCardProps) {
  const releaseInfo = useMemo(() => {
    const fields = releaseFieldsFromAnime(anime);
    return fields;
  }, [anime]);

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

  const malUrl =
    anime.malId && anime.malId > 0
      ? `https://myanimelist.net/anime/${anime.malId}`
      : null;
  const anilistUrl =
    anime.anilistId && anime.anilistId > 0
      ? `https://anilist.co/anime/${anime.anilistId}`
      : null;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-lg border border-slate-700/70 bg-[#161920] shadow-sm transition hover:border-slate-600/80 ${
        accentClassName ?? ""
      }`}
    >
      <div className="border-b border-slate-700/50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-sky-400">
            {anime.title}
          </h3>
          {headerRight ? (
            <div className="flex shrink-0 items-center gap-1">{headerRight}</div>
          ) : null}
        </div>
        {anime.genres.length > 0 && (
          <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-slate-500">
            {formatGenreLine(anime.genres)}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-row">
        <div className="relative w-[108px] shrink-0 lg:w-[118px]">
          {countdownTarget && countdown && (
            <div className="absolute inset-x-0 top-0 z-10 bg-black/90 px-2 py-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {countdownTarget.label}
              </p>
              <p className="mt-0.5 font-mono text-[11px] font-bold leading-tight text-amber-300">
                {countdown}
              </p>
            </div>
          )}

          {anime.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anime.imageUrl}
              alt=""
              className="aspect-[2/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-slate-800/80">
              <Sparkles className="h-8 w-8 text-violet-400/70" />
            </div>
          )}

          {anime.score != null && anime.score > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Star className="h-3 w-3 fill-amber-300" />
              {anime.score.toFixed(2)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1 px-2.5 py-2.5">
          {anime.studios && anime.studios.length > 0 && (
            <p className="line-clamp-1 text-xs font-medium text-sky-300/90">
              {anime.studios.join(", ")}
            </p>
          )}

          {releaseLabel && (
            <p
              className={`line-clamp-1 text-xs ${
                releaseLabel === NO_RELEASE_DATA
                  ? "italic text-slate-500"
                  : "text-slate-300"
              }`}
            >
              {releaseLabel}
            </p>
          )}

          <p className="text-xs text-slate-500">{formatEpisodeLine(anime)}</p>

          {anime.synopsis ? (
            <p className="line-clamp-3 text-xs leading-5 text-slate-400">
              {anime.synopsis}
            </p>
          ) : (
            <p className="text-xs italic text-slate-600">
              No synopsis yet.
            </p>
          )}

          {actions ? <div className="pt-2">{actions}</div> : null}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {malUrl && (
            <a
              href={malUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-sky-500/40 hover:text-sky-300"
              title="MyAnimeList"
            >
              MAL
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {anilistUrl && (
            <a
              href={anilistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:border-sky-500/40 hover:text-sky-300"
              title="AniList"
            >
              AniList
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {footerExtra ? (
          <div className="flex flex-wrap items-center gap-2">{footerExtra}</div>
        ) : null}
      </div>
    </article>
  );
}
