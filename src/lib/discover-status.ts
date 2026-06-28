import {
  getMemberStatus,
  setMemberStatus,
  statusShowsEpisodeProgress,
  type AnimeStatus,
  type MemberStatuses,
} from "@/lib/statuses";

export type DiscoverStatusEntry = {
  status?: AnimeStatus;
  episodesWatched?: number;
  rating?: number;
  updatedAt: string;
};

export type DiscoverStatuses = Record<string, DiscoverStatusEntry>;

const STORAGE_PREFIX = "anime-watchlist-discover-status";

function storageKey(user: string): string {
  return `${STORAGE_PREFIX}:${user.trim().toLowerCase()}`;
}

export function discoverItemKey(
  malId?: number | null,
  anilistId?: number | null,
): string | null {
  if (malId && malId > 0) return `mal:${malId}`;
  if (anilistId && anilistId > 0) return `anilist:${anilistId}`;
  return null;
}

export function loadDiscoverStatuses(user: string): DiscoverStatuses {
  if (typeof window === "undefined" || !user.trim()) return {};

  try {
    const raw = localStorage.getItem(storageKey(user));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DiscoverStatuses;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDiscoverStatuses(user: string, statuses: DiscoverStatuses) {
  if (typeof window === "undefined" || !user.trim()) return;
  localStorage.setItem(storageKey(user), JSON.stringify(statuses));
}

export function setDiscoverStatus(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
  status: AnimeStatus,
  episodesWatched?: number,
): DiscoverStatuses {
  const key = discoverItemKey(malId, anilistId);
  if (!key) return loadDiscoverStatuses(user);

  const next = { ...loadDiscoverStatuses(user) };

  if (status === "none") {
    const existing = next[key];
    if (existing?.rating && existing.rating > 0) {
      next[key] = {
        rating: existing.rating,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete next[key];
    }
  } else {
    const entry: DiscoverStatusEntry = {
      status,
      updatedAt: new Date().toISOString(),
    };
    const previous = next[key];
    if (previous?.rating && previous.rating > 0) {
      entry.rating = previous.rating;
    }
    if (
      statusShowsEpisodeProgress(status) &&
      episodesWatched != null &&
      episodesWatched >= 0
    ) {
      entry.episodesWatched = episodesWatched;
    }
    next[key] = entry;
  }

  writeDiscoverStatuses(user, next);
  return next;
}

export function setDiscoverEpisodesWatched(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
  episodesWatched: number,
): DiscoverStatuses {
  const key = discoverItemKey(malId, anilistId);
  if (!key) return loadDiscoverStatuses(user);

  const current = loadDiscoverStatuses(user)[key];
  if (!current?.status || !statusShowsEpisodeProgress(current.status)) {
    return loadDiscoverStatuses(user);
  }

  return setDiscoverStatus(
    user,
    malId,
    anilistId,
    current.status,
    episodesWatched,
  );
}

export function setDiscoverRating(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
  rating: number,
): DiscoverStatuses {
  const key = discoverItemKey(malId, anilistId);
  if (!key) return loadDiscoverStatuses(user);

  const next = { ...loadDiscoverStatuses(user) };
  const current = next[key];

  if (rating <= 0) {
    if (current?.status) {
      const { rating: _removed, ...rest } = current;
      next[key] = { ...rest, updatedAt: new Date().toISOString() };
    } else {
      delete next[key];
    }
  } else {
    next[key] = {
      ...current,
      rating,
      updatedAt: new Date().toISOString(),
    };
  }

  writeDiscoverStatuses(user, next);
  return next;
}

export function getDiscoverRating(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
): number {
  const entry = getDiscoverStatusEntry(user, malId, anilistId);
  return entry?.rating && entry.rating > 0 ? entry.rating : 0;
}

export function getDiscoverStatusEntry(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
): DiscoverStatusEntry | null {
  const key = discoverItemKey(malId, anilistId);
  if (!key) return null;
  return loadDiscoverStatuses(user)[key] ?? null;
}

export function clearDiscoverEntry(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
): DiscoverStatuses {
  const key = discoverItemKey(malId, anilistId);
  if (!key) return loadDiscoverStatuses(user);

  const next = { ...loadDiscoverStatuses(user) };
  delete next[key];
  writeDiscoverStatuses(user, next);
  return next;
}

export function clearDiscoverStatus(
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
): DiscoverStatuses {
  return setDiscoverStatus(user, malId, anilistId, "none");
}

export function clearAllDiscoverStatuses(user: string): void {
  if (typeof window === "undefined" || !user.trim()) return;
  localStorage.removeItem(storageKey(user));
}

export function applyDiscoverStatusToMemberStatuses(
  memberStatuses: Parameters<typeof setMemberStatus>[0],
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
) {
  const local = getDiscoverStatusEntry(user, malId, anilistId);
  if (!local?.status || local.status === "none") return memberStatuses;

  return setMemberStatus(
    memberStatuses,
    user,
    local.status,
    local.episodesWatched,
  );
}

export function applyDiscoverEntryToWatchlist(
  memberStatuses: MemberStatuses,
  ratings: Record<string, number>,
  user: string,
  malId: number | null | undefined,
  anilistId: number | null | undefined,
): {
  memberStatuses: MemberStatuses;
  ratings: Record<string, number>;
  changed: boolean;
} {
  const local = getDiscoverStatusEntry(user, malId, anilistId);
  if (!local) {
    return { memberStatuses, ratings, changed: false };
  }

  let nextStatuses = memberStatuses;
  let nextRatings = ratings;
  let changed = false;

  if (local.status && local.status !== "none") {
    nextStatuses = setMemberStatus(
      memberStatuses,
      user,
      local.status,
      local.episodesWatched,
    );
    changed = true;
  }

  if (local.rating && local.rating > 0) {
    nextRatings = { ...ratings, [user]: local.rating };
    changed = true;
  }

  return { memberStatuses: nextStatuses, ratings: nextRatings, changed };
}

export type DiscoverStatusSync = {
  animeId: string;
  malId: number | null;
  anilistId: number | null;
  memberStatuses: MemberStatuses;
};

/** Anime already on the watchlist but user still has a local discover status to merge. */
export function getDiscoverStatusSyncs(
  animeList: {
    id: string;
    malId: number | null;
    anilistId?: number | null;
    memberStatuses: MemberStatuses;
  }[],
  user: string,
): DiscoverStatusSync[] {
  const localStatuses = loadDiscoverStatuses(user);
  if (Object.keys(localStatuses).length === 0) return [];

  const syncs: DiscoverStatusSync[] = [];

  for (const anime of animeList) {
    const key = discoverItemKey(anime.malId, anime.anilistId);
    if (!key || !localStatuses[key]) continue;

    if (getMemberStatus(anime.memberStatuses, user) !== "none") continue;

    const local = localStatuses[key];
    if (!local?.status || local.status === "none") continue;

    const merged = applyDiscoverStatusToMemberStatuses(
      anime.memberStatuses,
      user,
      anime.malId,
      anime.anilistId,
    );
    if (merged === anime.memberStatuses) continue;

    syncs.push({
      animeId: anime.id,
      malId: anime.malId,
      anilistId: anime.anilistId ?? null,
      memberStatuses: merged,
    });
  }

  return syncs;
}
