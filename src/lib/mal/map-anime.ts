import { parseMalDuration } from "@/lib/mal/jikan";
import { extractSeriesKey, pickDisplayTitle } from "@/lib/mal/titles";

export type JikanGenre = { name: string };

export type JikanBroadcast = {
  day?: string | null;
  time?: string | null;
  timezone?: string | null;
};

export type JikanAnime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  episodes: number | null;
  duration: string | null;
  genres: JikanGenre[];
  status?: string | null;
  aired?: { from?: string | null; to?: string | null };
  broadcast?: JikanBroadcast | null;
  season?: string | null;
  year?: number | null;
  images?: { jpg?: { image_url?: string } };
};

export type MappedMalAnime = {
  malId: number;
  title: string;
  titleEnglish: string | null;
  seriesKey: string;
  episodes: number | null;
  episodeDurationMin: number | null;
  totalDurationMin: number | null;
  genres: string[];
  malStatus: string | null;
  imageUrl: string | null;
  airedFrom: string | null;
  airedTo: string | null;
  broadcastDay: string | null;
  broadcastTime: string | null;
  malSeason: string | null;
  malYear: number | null;
};

export function mapJikanAnime(anime: JikanAnime): MappedMalAnime {
  const titleEnglish = anime.title_english?.trim() || null;
  const displayTitle = pickDisplayTitle(anime.title, titleEnglish);
  const { episodeDurationMin, totalDurationMin } = parseMalDuration(
    anime.duration,
    anime.episodes,
  );

  return {
    malId: anime.mal_id,
    title: displayTitle,
    titleEnglish,
    seriesKey: extractSeriesKey(displayTitle),
    episodes: anime.episodes,
    episodeDurationMin,
    totalDurationMin,
    genres: anime.genres.map((genre) => genre.name),
    malStatus: anime.status ?? null,
    imageUrl: anime.images?.jpg?.image_url ?? null,
    airedFrom: anime.aired?.from ?? null,
    airedTo: anime.aired?.to ?? null,
    broadcastDay: anime.broadcast?.day ?? null,
    broadcastTime: anime.broadcast?.time ?? null,
    malSeason: anime.season ?? null,
    malYear: anime.year ?? null,
  };
}
