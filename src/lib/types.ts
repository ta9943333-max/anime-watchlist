export const FRIENDS = ["Alex", "Ben", "Mia"] as const;

export type Friend = (typeof FRIENDS)[number];

export type FilterOption = "all" | "watched-by-me" | "unwatched";

export type AnimeEntry = {
  id: string;
  title: string;
  watchedBy: Friend[];
  createdAt: string;
};

export type WatchlistState = {
  animeList: AnimeEntry[];
};
