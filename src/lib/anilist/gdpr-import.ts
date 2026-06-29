/**
 * AniList-GDPR-Listen-Eintrag → App-Daten (1:1, keine Staffel-Zusammenführung).
 */
import { extractSeriesKey, pickDisplayTitle } from "@/lib/mal/titles";
import type { AnimeStatus } from "@/lib/statuses";

export const ANILIST_LIST_STATUS = {
  CURRENT: 1,
  COMPLETED: 2,
  PAUSED: 3,
  DROPPED: 4,
  PLANNING: 5,
  REPEATING: 6,
} as const;

export type AnilistGdprListEntry = {
  series_id: number;
  status: number;
  score: number;
  progress: number;
  repeat: number;
};

export type AnilistMediaNode = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  episodes: number | null;
  duration: number | null;
  genres: string[];
  status: string | null;
};

export type GdprImportRow = {
  anilistId: number;
  malId: number | null;
  title: string;
  titleEnglish: string | null;
  titleRomaji: string | null;
  seriesKey: string;
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
  genres: string[];
  malStatus: string | null;
  status: AnimeStatus;
  episodesWatched: number;
  rewatchCount: number;
  rating: number | null;
};

function mapAnilistStatus(code: number): AnimeStatus {
  switch (code) {
    case ANILIST_LIST_STATUS.CURRENT:
      return "watching";
    case ANILIST_LIST_STATUS.COMPLETED:
      return "completed";
    case ANILIST_LIST_STATUS.PAUSED:
      return "paused";
    case ANILIST_LIST_STATUS.DROPPED:
      return "dropped";
    case ANILIST_LIST_STATUS.PLANNING:
      return "planning";
    case ANILIST_LIST_STATUS.REPEATING:
      return "rewatching";
    default:
      return "completed";
  }
}

function mapMediaStatus(status: string | null): string | null {
  switch (status) {
    case "RELEASING":
      return "Currently Airing";
    case "FINISHED":
      return "Finished Airing";
    case "NOT_YET_RELEASED":
      return "Not yet aired";
    case "CANCELLED":
      return "Cancelled";
    case "HIATUS":
      return "On Hiatus";
    default:
      return status;
  }
}

function anilistScoreToTen(score: number): number | null {
  if (!score || score <= 0) return null;
  return Math.min(10, Math.max(1, Math.round(score / 10)));
}

/** Ein CSV-Listen-Eintrag + AniList-Media → ein Watchlist-Eintrag (eine Staffel = ein Eintrag). */
export function mapGdprEntryToImportRow(
  list: AnilistGdprListEntry,
  media: AnilistMediaNode,
): GdprImportRow {
  const romaji = media.title.romaji?.trim() || "Unknown";
  const titleEnglish = media.title.english?.trim() || null;
  const title = pickDisplayTitle(romaji, titleEnglish);
  const episodes = media.episodes ?? null;
  const episodeDurationMin = media.duration ?? null;
  const totalDurationMin =
    episodeDurationMin && episodes
      ? episodeDurationMin * episodes
      : episodeDurationMin;

  const status = mapAnilistStatus(list.status);
  const progress = list.progress ?? 0;
  const repeat = list.repeat ?? 0;

  return {
    anilistId: media.id,
    malId: media.idMal ?? null,
    title,
    titleEnglish,
    titleRomaji: romaji,
    seriesKey: extractSeriesKey(title),
    episodes,
    episodeDurationMin,
    totalDurationMin,
    genres: [...(media.genres ?? [])].sort(),
    malStatus: mapMediaStatus(media.status),
    status,
    episodesWatched: progress,
    rewatchCount: repeat > 0 ? repeat + 1 : 1,
    rating: anilistScoreToTen(list.score),
  };
}

export function mapAllGdprEntries(
  entries: AnilistGdprListEntry[],
  mediaById: Map<number, AnilistMediaNode>,
): GdprImportRow[] {
  const rows: GdprImportRow[] = [];
  for (const entry of entries) {
    const media = mediaById.get(entry.series_id);
    if (!media) continue;
    rows.push(mapGdprEntryToImportRow(entry, media));
  }
  return rows;
}
