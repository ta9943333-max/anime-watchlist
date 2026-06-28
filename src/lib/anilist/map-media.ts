import { extractSeriesKey, pickDisplayTitle } from "@/lib/mal/titles";
import type { DiscoverItem } from "@/lib/mal/jikan";

export type AnilistMediaNode = {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native?: string | null;
  };
  episodes: number | null;
  duration: number | null;
  genres: string[];
  status: string | null;
  description: string | null;
  averageScore: number | null;
  coverImage: { large: string | null; medium: string | null } | null;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  endDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null;
  season: string | null;
  seasonYear: number | null;
  studios: { nodes: { name: string }[] } | null;
  nextAiringEpisode: {
    episode: number;
    timeUntilAiring: number;
    airingAt: number;
  } | null;
};

function stripDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function dateToIso(
  date: {
    year: number | null;
    month: number | null;
    day: number | null;
  } | null,
): string | null {
  if (!date?.year) return null;
  const month = date.month ?? 1;
  const day = date.day ?? 1;
  return new Date(Date.UTC(date.year, month - 1, day)).toISOString();
}

function mapAnilistStatus(status: string | null): string | null {
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

function capitalizeSeason(season: string | null): string | null {
  if (!season) return null;
  return season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
}

export function mapAnilistMediaToDiscoverItem(
  media: AnilistMediaNode,
): DiscoverItem {
  const romaji = media.title.romaji?.trim() || "Unknown";
  const titleEnglish = media.title.english?.trim() || null;
  const displayTitle = pickDisplayTitle(romaji, titleEnglish);
  const episodeDurationMin = media.duration ?? null;
  const episodes = media.episodes ?? null;

  return {
    anilistId: media.id,
    malId: media.idMal ?? 0,
    title: displayTitle,
    titleEnglish,
    titleRomaji: romaji,
    seriesKey: extractSeriesKey(displayTitle),
    episodes,
    episodeDurationMin,
    totalDurationMin:
      episodeDurationMin && episodes
        ? episodeDurationMin * episodes
        : episodeDurationMin,
    genres: media.genres ?? [],
    malStatus: mapAnilistStatus(media.status),
    imageUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
    airedFrom: dateToIso(media.startDate),
    airedTo: dateToIso(media.endDate),
    broadcastDay: null,
    broadcastTime: null,
    malSeason: capitalizeSeason(media.season),
    malYear: media.seasonYear ?? media.startDate?.year ?? null,
    synopsis: stripDescription(media.description),
    studios: (media.studios?.nodes ?? []).map((studio) => studio.name),
    score: media.averageScore ? media.averageScore / 10 : null,
    nextEpisode: media.nextAiringEpisode?.episode ?? null,
    timeUntilAiring: media.nextAiringEpisode?.timeUntilAiring ?? null,
    airingAt: media.nextAiringEpisode?.airingAt ?? null,
    anilistStatus: media.status,
  };
}
