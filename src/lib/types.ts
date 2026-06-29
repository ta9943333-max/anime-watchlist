import {
  getMemberStatus,
  type AnimeStatus,
  type MemberStatuses,
} from "@/lib/statuses";

export type FilterOption = "all" | "no-status" | AnimeStatus;

export type SortOption = "newest" | "title-asc" | "title-desc";

export type ViewTab = "list" | "discover" | "leaderboard" | "profile";

export type LeaderboardPeriod = "today" | "week" | "month" | "year" | "all";

export type Member = {
  id: string;
  name: string;
  createdAt: string;
  profileStats?: import("@/lib/anilist/profile-stats").AnilistProfileStats | null;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

export type AnimeEntry = {
  id: string;
  title: string;
  titleEnglish: string | null;
  seriesKey: string | null;
  malStatus: string | null;
  memberStatuses: MemberStatuses;
  folderId: string | null;
  createdAt: string;
  malId: number | null;
  anilistId: number | null;
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
  genres: string[];
  ratings: Record<string, number>;
  airedFrom: string | null;
  airedTo: string | null;
  broadcastDay: string | null;
  broadcastTime: string | null;
  malSeason: string | null;
  malYear: number | null;
};

export function getDisplayTitle(anime: AnimeEntry): string {
  return anime.titleEnglish?.trim() || anime.title;
}

export function getAverageRating(ratings: Record<string, number>): {
  average: number;
  count: number;
} {
  const values = Object.values(ratings).filter(
    (value) => typeof value === "number" && value > 0,
  );
  if (values.length === 0) return { average: 0, count: 0 };
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    average: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  };
}

export type AddAnimePayload = {
  title: string;
  titleEnglish?: string | null;
  seriesKey?: string | null;
  malStatus?: string | null;
  folderId?: string | null;
  malId?: number | null;
  anilistId?: number | null;
  episodes?: number | null;
  episodeDurationMin?: number | null;
  totalDurationMin?: number | null;
  genres?: string[];
  airedFrom?: string | null;
  airedTo?: string | null;
  broadcastDay?: string | null;
  broadcastTime?: string | null;
  malSeason?: string | null;
  malYear?: number | null;
};

export function sortMembersByName(members: Member[]): Member[] {
  return [...members].sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
  );
}

export function sortAnimeList(
  list: AnimeEntry[],
  sort: SortOption,
): AnimeEntry[] {
  const copy = [...list];

  switch (sort) {
    case "title-asc":
      return copy.sort((a, b) => {
        const byTitle = getDisplayTitle(a).localeCompare(getDisplayTitle(b), "de", {
          sensitivity: "base",
        });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      });
    case "title-desc":
      return copy.sort((a, b) => {
        const byTitle = getDisplayTitle(b).localeCompare(getDisplayTitle(a), "de", {
          sensitivity: "base",
        });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      });
    default:
      return copy.sort((a, b) => {
        const byDate =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
      });
  }
}

export function mergeAnimeLists(
  prev: AnimeEntry[],
  incoming: AnimeEntry[],
): AnimeEntry[] {
  if (prev.length === 0) {
    return sortAnimeList(incoming, "newest");
  }

  const incomingMap = new Map(incoming.map((entry) => [entry.id, entry]));
  const merged = prev
    .map((entry) => incomingMap.get(entry.id))
    .filter((entry): entry is AnimeEntry => entry !== undefined);

  const prevIds = new Set(prev.map((entry) => entry.id));
  const added = incoming.filter((entry) => !prevIds.has(entry.id));
  added.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return [...added, ...merged];
}

export function applyAnimeFilters(
  list: AnimeEntry[],
  options: {
    currentUser: string;
    filter: FilterOption;
    search: string;
    sort: SortOption;
    scope: "all" | "folder" | "general";
    folderId?: string | null;
    genre?: string | null;
  },
): AnimeEntry[] {
  let result = list;

  if (options.scope === "folder" && options.folderId) {
    result = result.filter((a) => a.folderId === options.folderId);
  } else if (options.scope === "general") {
    result = result.filter((a) => a.folderId === null);
  }

  result = result.filter((anime) => {
    const myStatus: AnimeStatus = options.currentUser
      ? getMemberStatus(anime.memberStatuses, options.currentUser)
      : "none";

    switch (options.filter) {
      case "all":
        return true;
      case "no-status":
        return myStatus === "none";
      default:
        return myStatus === options.filter;
    }
  });

  if (options.genre) {
    const genreQuery = options.genre.toLowerCase();
    result = result.filter((anime) =>
      anime.genres.some((genre) => genre.toLowerCase() === genreQuery),
    );
  }

  if (options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    result = result.filter((anime) => {
      const haystack = [
        anime.title,
        anime.titleEnglish ?? "",
        anime.seriesKey ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  return sortAnimeList(result, options.sort);
}
