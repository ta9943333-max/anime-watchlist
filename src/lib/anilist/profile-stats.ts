/**
 * Offizielle AniList-Profilstatistiken (GDPR user.statistics.anime).
 */
import {
  formatDaysFromMinutes,
  formatHoursFromMinutes,
  minutesToDays,
  minutesToHours,
} from "@/lib/time/precise";

export type AnilistProfileAnimeStats = {
  count: number;
  minutesWatched: number;
  progress: number;
  progressVolumes?: number;
  meanScore?: number;
  standardDeviation?: number;
};

export type AnilistProfileStats = {
  anime: AnilistProfileAnimeStats;
};

export function isAnilistProfileStats(
  value: unknown,
): value is AnilistProfileStats {
  if (!value || typeof value !== "object") return false;
  const anime = (value as AnilistProfileStats).anime;
  return (
    anime != null &&
    typeof anime.count === "number" &&
    typeof anime.minutesWatched === "number" &&
    typeof anime.progress === "number"
  );
}

export function memberStatsFromAnilistProfile(
  stats: AnilistProfileAnimeStats,
): {
  completedCount: number;
  episodesWatched: number;
  totalMinutes: number;
  totalHours: number;
  daysWatched: number;
  totalHoursLabel: string;
  daysWatchedLabel: string;
} {
  const totalMinutes = Math.round(stats.minutesWatched);
  return {
    completedCount: stats.count,
    episodesWatched: stats.progress,
    totalMinutes,
    totalHours: minutesToHours(totalMinutes),
    daysWatched: minutesToDays(totalMinutes),
    totalHoursLabel: formatHoursFromMinutes(totalMinutes),
    daysWatchedLabel: formatDaysFromMinutes(totalMinutes),
  };
}
