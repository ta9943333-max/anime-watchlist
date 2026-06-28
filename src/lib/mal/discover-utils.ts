import { getDisplayTitle, type AnimeEntry } from "@/lib/types";
import { getMemberStatus, getMemberEpisodesWatched } from "@/lib/statuses";
import type { DiscoverItem } from "@/lib/mal/jikan";

export function animeEntryToDiscoverItem(
  anime: AnimeEntry,
  currentUser: string,
): DiscoverItem {
  return {
    malId: anime.malId ?? 0,
    title: getDisplayTitle(anime),
    titleEnglish: anime.titleEnglish,
    seriesKey: anime.seriesKey ?? "",
    episodes: anime.episodes,
    episodeDurationMin: anime.episodeDurationMin,
    totalDurationMin: anime.totalDurationMin,
    genres: anime.genres,
    malStatus: anime.malStatus,
    imageUrl: null,
    airedFrom: anime.airedFrom,
    airedTo: anime.airedTo,
    broadcastDay: anime.broadcastDay,
    broadcastTime: anime.broadcastTime,
    malSeason: anime.malSeason,
    malYear: anime.malYear,
    synopsis: null,
    studios: [],
    score: null,
    watchlistId: anime.id,
    myStatus: getMemberStatus(anime.memberStatuses, currentUser),
    myEpisodesWatched: getMemberEpisodesWatched(
      anime.memberStatuses,
      currentUser,
    ),
  };
}

export function addPayloadFromDiscoverItem(
  item: DiscoverItem,
): import("@/lib/types").AddAnimePayload {
  return {
    title: item.title,
    titleEnglish: item.titleEnglish,
    seriesKey: item.seriesKey,
    malStatus: item.malStatus,
    malId: item.malId || null,
    episodes: item.episodes,
    episodeDurationMin: item.episodeDurationMin,
    totalDurationMin: item.totalDurationMin,
    genres: item.genres,
    airedFrom: item.airedFrom,
    airedTo: item.airedTo,
    broadcastDay: item.broadcastDay,
    broadcastTime: item.broadcastTime,
    malSeason: item.malSeason,
    malYear: item.malYear,
  };
}
