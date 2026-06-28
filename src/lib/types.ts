import {
  getMemberStatus,
  isFinishedStatus,
  type AnimeStatus,
  type MemberStatuses,
} from "@/lib/statuses";

export type FilterOption = "all" | "finished-by-me" | "no-status";

export type SortOption = "newest" | "title-asc" | "title-desc";

export type ViewTab = "list" | "leaderboard";

export type Member = {
  id: string;
  name: string;
  createdAt: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

export type AnimeEntry = {
  id: string;
  title: string;
  memberStatuses: MemberStatuses;
  folderId: string | null;
  createdAt: string;
  malId: number | null;
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
  genres: string[];
};

export type AddAnimePayload = {
  title: string;
  folderId?: string | null;
  malId?: number | null;
  episodes?: number | null;
  episodeDurationMin?: number | null;
  totalDurationMin?: number | null;
  genres?: string[];
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
        const byTitle = a.title.localeCompare(b.title, "de", {
          sensitivity: "base",
        });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      });
    case "title-desc":
      return copy.sort((a, b) => {
        const byTitle = b.title.localeCompare(a.title, "de", {
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
      case "finished-by-me":
        return isFinishedStatus(myStatus);
      case "no-status":
        return myStatus === "none";
      default:
        return true;
    }
  });

  if (options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    result = result.filter((anime) =>
      anime.title.toLowerCase().includes(query),
    );
  }

  return sortAnimeList(result, options.sort);
}
