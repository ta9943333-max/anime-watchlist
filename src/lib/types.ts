export type FilterOption = "all" | "watched-by-me" | "unwatched";

export type SortOption = "newest" | "title-asc" | "title-desc";

export type Member = {
  id: string;
  name: string;
  createdAt: string;
};

export type AnimeEntry = {
  id: string;
  title: string;
  watchedBy: string[];
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
      return copy.sort((a, b) =>
        a.title.localeCompare(b.title, "de", { sensitivity: "base" }),
      );
    case "title-desc":
      return copy.sort((a, b) =>
        b.title.localeCompare(a.title, "de", { sensitivity: "base" }),
      );
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}
