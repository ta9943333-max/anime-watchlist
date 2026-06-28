"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import {
  formatAnimeRelease,
  formatCountdown,
  getCountdownTarget,
  isUpcomingRelease,
  type AnimeReleaseFields,
} from "@/lib/mal/release-date";

type AnimeReleaseBadgeProps = {
  info: AnimeReleaseFields;
  showCountdown?: boolean;
  compact?: boolean;
};

export function AnimeReleaseBadge({
  info,
  showCountdown = true,
  compact = false,
}: AnimeReleaseBadgeProps) {
  const label = formatAnimeRelease(info);
  const countdownTarget = getCountdownTarget(info);
  const upcoming = isUpcomingRelease(info);
  const shouldCountdown = Boolean(countdownTarget && showCountdown);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldCountdown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [shouldCountdown]);

  const countdown =
    shouldCountdown && countdownTarget
      ? formatCountdown(countdownTarget.date, new Date(now))
      : null;

  if (!label && !countdown) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      {label && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium ${
            upcoming
              ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
              : "border-slate-700 bg-slate-950/60 text-slate-400"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {label}
        </span>
      )}
      {countdown && (
        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300">
          {countdown}
        </span>
      )}
    </div>
  );
}

export function releaseFieldsFromAnime(anime: {
  airedFrom?: string | null;
  airedTo?: string | null;
  broadcastDay?: string | null;
  broadcastTime?: string | null;
  malSeason?: string | null;
  malYear?: number | null;
  malStatus?: string | null;
  nextEpisode?: number | null;
  timeUntilAiring?: number | null;
  airingAt?: number | null;
}): AnimeReleaseFields {
  return {
    airedFrom: anime.airedFrom ?? null,
    airedTo: anime.airedTo ?? null,
    broadcastDay: anime.broadcastDay ?? null,
    broadcastTime: anime.broadcastTime ?? null,
    malSeason: anime.malSeason ?? null,
    malYear: anime.malYear ?? null,
    malStatus: anime.malStatus ?? null,
    nextEpisode: anime.nextEpisode ?? null,
    timeUntilAiring: anime.timeUntilAiring ?? null,
    airingAt: anime.airingAt ?? null,
  };
}
