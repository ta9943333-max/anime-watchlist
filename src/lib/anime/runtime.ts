export type AnimeRuntimeFields = {
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
};

export type ExactAnimeRuntime = {
  episodes: number;
  episodeDurationMin: number;
  totalDurationMin: number;
};

/**
 * Exact runtime only when episodes and duration are known and consistent.
 * Never invents placeholder values — stats must not use guesses.
 */
export function getExactRuntime(
  anime: AnimeRuntimeFields,
): ExactAnimeRuntime | null {
  const episodes =
    anime.episodes != null && anime.episodes > 0
      ? Math.floor(anime.episodes)
      : null;
  let episodeDurationMin =
    anime.episodeDurationMin != null && anime.episodeDurationMin > 0
      ? anime.episodeDurationMin
      : null;
  let totalDurationMin =
    anime.totalDurationMin != null && anime.totalDurationMin > 0
      ? Math.round(anime.totalDurationMin)
      : null;

  if (episodes == null) return null;

  if (episodeDurationMin != null) {
    totalDurationMin = episodes * episodeDurationMin;
  } else if (totalDurationMin != null) {
    if (totalDurationMin % episodes !== 0) {
      return null;
    }
    episodeDurationMin = totalDurationMin / episodes;
  } else {
    return null;
  }

  if (episodeDurationMin <= 0 || totalDurationMin <= 0) {
    return null;
  }

  return {
    episodes,
    episodeDurationMin,
    totalDurationMin,
  };
}

export function hasExactRuntime(anime: AnimeRuntimeFields): boolean {
  return getExactRuntime(anime) != null;
}

export function runtimeNeedsPersist(anime: AnimeRuntimeFields): boolean {
  const exact = getExactRuntime(anime);
  if (!exact) return true;
  return (
    anime.episodes !== exact.episodes ||
    anime.episodeDurationMin !== exact.episodeDurationMin ||
    anime.totalDurationMin !== exact.totalDurationMin
  );
}

/** Integer minutes for partial progress — avoids floating-point drift. */
export function minutesForEpisodesWatched(
  episodesWatched: number,
  runtime: ExactAnimeRuntime,
): number {
  if (episodesWatched <= 0) return 0;
  if (episodesWatched >= runtime.episodes) {
    return runtime.totalDurationMin;
  }
  return Math.round(
    (episodesWatched * runtime.totalDurationMin) / runtime.episodes,
  );
}

export function formatWatchHours(totalMinutes: number): number {
  return totalMinutes / 60;
}

export function formatWatchDays(totalMinutes: number): number {
  return totalMinutes / 1440;
}

/** Merge local row with MAL fields and return exact runtime when possible. */
export function mergeMalRuntime(
  anime: AnimeRuntimeFields,
  mal: AnimeRuntimeFields,
): ExactAnimeRuntime | null {
  return getExactRuntime({
    episodes: mal.episodes ?? anime.episodes,
    episodeDurationMin: mal.episodeDurationMin ?? anime.episodeDurationMin,
    totalDurationMin: mal.totalDurationMin ?? anime.totalDurationMin,
  });
}
