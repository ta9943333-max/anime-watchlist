import { DEFAULT_EPISODE_DURATION_MIN } from "@/lib/statuses";

export type AnimeRuntimeFields = {
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
};

export type ResolvedAnimeRuntime = {
  episodes: number;
  episodeDurationMin: number;
  totalDurationMin: number;
};

/** Fill missing episode counts / runtime so stats always have something to sum. */
export function resolveAnimeRuntime(
  anime: AnimeRuntimeFields,
): ResolvedAnimeRuntime {
  let episodes =
    anime.episodes != null && anime.episodes > 0 ? anime.episodes : null;
  let episodeDurationMin =
    anime.episodeDurationMin != null && anime.episodeDurationMin > 0
      ? anime.episodeDurationMin
      : null;
  let totalDurationMin =
    anime.totalDurationMin != null && anime.totalDurationMin > 0
      ? anime.totalDurationMin
      : null;

  if (totalDurationMin != null && episodeDurationMin != null && episodes == null) {
    episodes = Math.max(1, Math.round(totalDurationMin / episodeDurationMin));
  }

  if (episodes != null && totalDurationMin != null && episodeDurationMin == null) {
    episodeDurationMin = totalDurationMin / episodes;
  }

  if (episodes != null && episodeDurationMin != null && totalDurationMin == null) {
    totalDurationMin = Math.round(episodes * episodeDurationMin);
  }

  if (episodes != null && episodeDurationMin == null && totalDurationMin == null) {
    episodeDurationMin = DEFAULT_EPISODE_DURATION_MIN;
    totalDurationMin = Math.round(episodes * episodeDurationMin);
  }

  if (episodes == null && totalDurationMin != null && episodeDurationMin != null) {
    episodes = Math.max(1, Math.round(totalDurationMin / episodeDurationMin));
  }

  if (episodes == null) {
    episodes = 12;
    episodeDurationMin = DEFAULT_EPISODE_DURATION_MIN;
    totalDurationMin = Math.round(episodes * episodeDurationMin);
  }

  if (episodeDurationMin == null || episodeDurationMin <= 0) {
    episodeDurationMin = DEFAULT_EPISODE_DURATION_MIN;
  }

  if (totalDurationMin == null || totalDurationMin <= 0) {
    totalDurationMin = Math.round(episodes * episodeDurationMin);
  }

  return {
    episodes,
    episodeDurationMin,
    totalDurationMin,
  };
}

export function runtimeNeedsPersist(anime: AnimeRuntimeFields): boolean {
  const resolved = resolveAnimeRuntime(anime);
  return (
    anime.episodes !== resolved.episodes ||
    anime.episodeDurationMin !== resolved.episodeDurationMin ||
    anime.totalDurationMin !== resolved.totalDurationMin
  );
}
