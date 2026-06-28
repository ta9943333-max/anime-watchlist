import {
  getExactRuntime,
  minutesForEpisodesWatched,
  type ExactAnimeRuntime,
} from "@/lib/anime/runtime";
import {
  FINISHED_STATUSES,
  getMemberEpisodesWatched,
  getMemberRewatchCount,
  getMemberStatus,
  statusShowsEpisodeProgress,
  type MemberStatuses,
} from "@/lib/statuses";
import type { AnimeEntry } from "@/lib/types";

export type WatchContribution = {
  episodes: number;
  minutes: number;
  countsAsFinishedSeries: boolean;
  rewatchTimes: number;
};

function contributionFromRuntime(
  runtime: ExactAnimeRuntime,
  status: ReturnType<typeof getMemberStatus>,
  statuses: MemberStatuses,
  memberName: string,
): WatchContribution | null {
  if (status === "rewatching") {
    const times = getMemberRewatchCount(statuses, memberName);
    return {
      episodes: runtime.episodes * times,
      minutes: runtime.totalDurationMin * times,
      countsAsFinishedSeries: true,
      rewatchTimes: times,
    };
  }

  if (status === "completed") {
    return {
      episodes: runtime.episodes,
      minutes: runtime.totalDurationMin,
      countsAsFinishedSeries: true,
      rewatchTimes: 1,
    };
  }

  if (statusShowsEpisodeProgress(status)) {
    const watched = getMemberEpisodesWatched(statuses, memberName);
    if (watched == null || watched <= 0) return null;
    const episodes = Math.min(Math.floor(watched), runtime.episodes);
    const minutes = minutesForEpisodesWatched(episodes, runtime);
    if (episodes <= 0 && minutes <= 0) return null;
    return {
      episodes,
      minutes,
      countsAsFinishedSeries: false,
      rewatchTimes: 0,
    };
  }

  return null;
}

/**
 * Exact watch stats for one member on one anime.
 * Returns null when runtime data is incomplete (no estimates).
 */
export function computeWatchContribution(
  anime: Pick<
    AnimeEntry,
    "episodes" | "episodeDurationMin" | "totalDurationMin" | "memberStatuses"
  >,
  memberName: string,
): WatchContribution | null {
  const status = getMemberStatus(anime.memberStatuses, memberName);
  if (status === "none") return null;

  const runtime = getExactRuntime(anime);
  if (!runtime) return null;

  return contributionFromRuntime(
    runtime,
    status,
    anime.memberStatuses,
    memberName,
  );
}

export function isFinishedWatchContribution(
  contribution: WatchContribution,
): boolean {
  return contribution.countsAsFinishedSeries;
}
