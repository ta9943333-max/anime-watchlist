export type FilterOption = "all" | "watched-by-me" | "unwatched";

export type SortOption = "newest" | "title-asc" | "title-desc";

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
  watchedBy: string[];
  folderId: string | null;
  createdAt: string;
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

/** Behält die aktuelle Listen-Reihenfolge bei, aktualisiert nur Inhalte. */
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

  const removedIds = new Set(
    incoming.filter((entry) => !prevIds.has(entry.id)).map((e) => e.id),
  );
  void removedIds;

  return [...added, ...merged];
}

export function countWatchedByMembers(
  watchedBy: string[],
  members: Member[],
): number {
  const memberNames = new Set(members.map((m) => m.name));
  return watchedBy.filter((name) => memberNames.has(name)).length;
}

export function hasWatchedByMember(
  watchedBy: string[],
  memberName: string,
): boolean {
  return watchedBy.includes(memberName);
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
    const watchedByMe = hasWatchedByMember(anime.watchedBy, options.currentUser);

    switch (options.filter) {
      case "watched-by-me":
        return watchedByMe;
      case "unwatched":
        return !watchedByMe;
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
