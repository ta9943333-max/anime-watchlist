import type { ScoreFormat } from "@/lib/anilist/rating";

export type MediaListStatus =
  | "CURRENT"
  | "PLANNING"
  | "COMPLETED"
  | "DROPPED"
  | "PAUSED"
  | "REPEATING";

export type AnilistTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

export type AnilistFuzzyDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

export type AnilistViewer = {
  id: number;
  name: string;
  avatar: { large: string | null; medium: string | null } | null;
  bannerImage: string | null;
  options: { scoreFormat: ScoreFormat } | null;
  statistics: {
    anime: {
      count: number;
      episodesWatched: number;
      minutesWatched: number;
      meanScore: number;
    };
  } | null;
};

export type AnilistListMedia = {
  id: number;
  idMal: number | null;
  title: AnilistTitle;
  episodes: number | null;
  duration: number | null;
  genres: string[];
  status: string | null;
  description: string | null;
  averageScore: number | null;
  coverImage: { large: string | null; medium: string | null } | null;
  seasonYear: number | null;
  season: string | null;
  format: string | null;
  nextAiringEpisode: {
    episode: number;
    timeUntilAiring: number;
    airingAt: number;
  } | null;
};

export type AnilistMediaListEntry = {
  id: number;
  mediaId: number;
  status: MediaListStatus | null;
  score: number | null;
  progress: number | null;
  repeat: number | null;
  notes: string | null;
  startedAt: AnilistFuzzyDate | null;
  completedAt: AnilistFuzzyDate | null;
  media: AnilistListMedia;
};

export type AnilistMediaListGroup = {
  name: string;
  isCustomList: boolean;
  status: MediaListStatus | null;
  entries: AnilistMediaListEntry[];
};

export type AnilistMediaDetail = AnilistListMedia & {
  meanScore: number | null;
  source: string | null;
  studios: { nodes: { name: string }[] } | null;
  characters: {
    edges: {
      role: string;
      node: {
        id: number;
        name: { full: string };
        image: { large: string | null };
      };
    }[];
  } | null;
  relations: {
    edges: {
      relationType: string;
      node: {
        id: number;
        title: AnilistTitle;
        type: string;
        coverImage: { medium: string | null };
      };
    }[];
  } | null;
  mediaListEntry: AnilistMediaListEntry | null;
};

export const MEDIA_LIST_STATUS_LABELS: Record<MediaListStatus, string> = {
  CURRENT: "Watching",
  PLANNING: "Planning",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "Paused",
  REPEATING: "Rewatching",
};

export const MEDIA_LIST_STATUSES: MediaListStatus[] = [
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "DROPPED",
  "PAUSED",
  "REPEATING",
];

export function mediaListStatusFromSlug(
  slug: string | undefined,
): MediaListStatus | null {
  if (!slug) return "CURRENT";
  const normalized = slug.toUpperCase().replace(/-/g, "_");
  if (normalized === "WATCHING") return "CURRENT";
  if (normalized === "REWATCHING") return "REPEATING";
  if (MEDIA_LIST_STATUSES.includes(normalized as MediaListStatus)) {
    return normalized as MediaListStatus;
  }
  return "CURRENT";
}

export function mediaListStatusToSlug(status: MediaListStatus): string {
  return MEDIA_LIST_STATUS_LABELS[status].toLowerCase();
}

export function pickMediaTitle(title: AnilistTitle): string {
  return (
    title.english?.trim() ||
    title.romaji?.trim() ||
    title.native?.trim() ||
    "Unknown"
  );
}
