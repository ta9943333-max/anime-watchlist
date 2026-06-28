import { searchMalAnime, fetchMalAnimeDetails } from "@/lib/mal/jikan";
import { mergeGenres, prettifySeriesKey, isLikelySeasonSequel } from "@/lib/mal/titles";
import {
  getExactRuntime,
  mergeMalRuntime,
  runtimeNeedsPersist,
} from "@/lib/anime/runtime";
import {
  FINISHED_STATUSES,
  getMemberStatus,
  migrateWatchedByToStatuses,
  normalizeMemberStatuses,
  serializeMemberStatuses,
  type MemberStatuses,
} from "@/lib/statuses";
import { supabase } from "@/lib/supabase/client";
import type { AnimeRow } from "@/lib/supabase/database.types";
import type { AddAnimePayload, AnimeEntry } from "@/lib/types";

function parseMemberStatuses(row: AnimeRow): MemberStatuses {
  const raw = row.member_statuses;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeMemberStatuses(raw);
  }

  return migrateWatchedByToStatuses(row.watched_by ?? [], {});
}

function parseRatings(row: AnimeRow): Record<string, number> {
  const raw = row.ratings;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num) && num >= 1 && num <= 10) {
      result[name] = num;
    }
  }
  return result;
}

function releasePayload(payload: AddAnimePayload) {
  return {
    aired_from: payload.airedFrom ?? null,
    aired_to: payload.airedTo ?? null,
    broadcast_day: payload.broadcastDay ?? null,
    broadcast_time: payload.broadcastTime ?? null,
    mal_season: payload.malSeason ?? null,
    mal_year: payload.malYear ?? null,
  };
}

function mapRow(row: AnimeRow): AnimeEntry {
  return {
    id: row.id,
    title: row.title,
    titleEnglish: row.title_english ?? null,
    seriesKey: row.series_key ?? null,
    malStatus: row.mal_status ?? null,
    memberStatuses: parseMemberStatuses(row),
    folderId: row.folder_id ?? null,
    createdAt: row.created_at,
    malId: row.mal_id ?? null,
    anilistId: row.anilist_id ?? null,
    episodes: row.episodes ?? null,
    episodeDurationMin: row.episode_duration_min ?? null,
    totalDurationMin: row.total_duration_min ?? null,
    genres: row.genres ?? [],
    ratings: parseRatings(row),
    airedFrom: row.aired_from ?? null,
    airedTo: row.aired_to ?? null,
    broadcastDay: row.broadcast_day ?? null,
    broadcastTime: row.broadcast_time ?? null,
    malSeason: row.mal_season ?? null,
    malYear: row.mal_year ?? null,
  };
}

function buildWatchedBy(memberStatuses: MemberStatuses): string[] {
  return Object.entries(memberStatuses)
    .filter(([, entry]) => FINISHED_STATUSES.includes(entry.status))
    .map(([name]) => name);
}

export async function fetchAnimeList(): Promise<AnimeEntry[]> {
  const { data, error } = await supabase
    .from("anime")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapRow);
}

export async function addAnime(payload: AddAnimePayload): Promise<AnimeEntry> {
  const exact = getExactRuntime({
    episodes: payload.episodes ?? null,
    episodeDurationMin: payload.episodeDurationMin ?? null,
    totalDurationMin: payload.totalDurationMin ?? null,
  });

  const { data, error } = await supabase
    .from("anime")
    .insert({
      title: payload.title,
      title_english: payload.titleEnglish ?? null,
      series_key: payload.seriesKey ?? null,
      mal_status: payload.malStatus ?? null,
      watched_by: [],
      member_statuses: {},
      folder_id: payload.folderId ?? null,
      mal_id: payload.malId ?? null,
      anilist_id: payload.anilistId ?? null,
      episodes: exact?.episodes ?? payload.episodes ?? null,
      episode_duration_min:
        exact?.episodeDurationMin ?? payload.episodeDurationMin ?? null,
      total_duration_min:
        exact?.totalDurationMin ?? payload.totalDurationMin ?? null,
      genres: payload.genres ?? [],
      ratings: {},
      ...releasePayload(payload),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function mergeSeasonIntoExisting(
  existing: AnimeEntry,
  payload: AddAnimePayload,
): Promise<AnimeEntry> {
  const mergedEpisodes =
    (existing.episodes ?? 0) + (payload.episodes ?? 0) || null;
  const mergedDuration =
    (existing.totalDurationMin ?? 0) + (payload.totalDurationMin ?? 0) || null;
  const mergedGenres = mergeGenres(existing.genres, payload.genres ?? []);
  const mergedTitle = existing.seriesKey
    ? prettifySeriesKey(existing.seriesKey)
    : existing.title;

  const { data, error } = await supabase
    .from("anime")
    .update({
      title: mergedTitle,
      episodes: mergedEpisodes,
      total_duration_min: mergedDuration,
      genres: mergedGenres,
      mal_status: payload.malStatus ?? existing.malStatus,
      aired_from: existing.airedFrom ?? payload.airedFrom ?? null,
      aired_to: existing.airedTo ?? payload.airedTo ?? null,
      broadcast_day: existing.broadcastDay ?? payload.broadcastDay ?? null,
      broadcast_time: existing.broadcastTime ?? payload.broadcastTime ?? null,
      mal_season: existing.malSeason ?? payload.malSeason ?? null,
      mal_year: existing.malYear ?? payload.malYear ?? null,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function addOrMergeAnime(
  payload: AddAnimePayload,
  existingList: AnimeEntry[],
): Promise<{ entry: AnimeEntry; merged: boolean }> {
  if (payload.malId) {
    const duplicateMal = existingList.find(
      (anime) => anime.malId === payload.malId,
    );
    if (duplicateMal) {
      return { entry: duplicateMal, merged: false };
    }
  }

  if (payload.anilistId) {
    const duplicateAnilist = existingList.find(
      (anime) => anime.anilistId === payload.anilistId,
    );
    if (duplicateAnilist) {
      return { entry: duplicateAnilist, merged: false };
    }
  }

  if (payload.seriesKey && payload.seriesKey.length > 2) {
    const incomingTitle =
      payload.titleEnglish?.trim() || payload.title?.trim() || "";
    const sameSeries = existingList.find(
      (anime) =>
        anime.seriesKey === payload.seriesKey &&
        anime.malId !== payload.malId &&
        anime.folderId === (payload.folderId ?? null),
    );

    if (sameSeries && isLikelySeasonSequel(incomingTitle)) {
      const merged = await mergeSeasonIntoExisting(sameSeries, payload);
      return { entry: merged, merged: true };
    }
  }

  const entry = await addAnime(payload);
  return { entry, merged: false };
}

export async function updateMemberStatuses(
  animeId: string,
  memberStatuses: MemberStatuses,
): Promise<void> {
  const { error } = await supabase
    .from("anime")
    .update({
      member_statuses: serializeMemberStatuses(memberStatuses),
      watched_by: buildWatchedBy(memberStatuses),
    })
    .eq("id", animeId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAnimeMalMetadata(
  animeId: string,
  metadata: {
    malId: number;
    title?: string;
    titleEnglish?: string | null;
    seriesKey?: string | null;
    malStatus?: string | null;
    episodes: number | null;
    episodeDurationMin: number | null;
    totalDurationMin: number | null;
    genres: string[];
    airedFrom?: string | null;
    airedTo?: string | null;
    broadcastDay?: string | null;
    broadcastTime?: string | null;
    malSeason?: string | null;
    malYear?: number | null;
  },
): Promise<AnimeEntry> {
  const { data, error } = await supabase
    .from("anime")
    .update({
      mal_id: metadata.malId,
      title: metadata.title,
      title_english: metadata.titleEnglish ?? null,
      series_key: metadata.seriesKey ?? null,
      mal_status: metadata.malStatus ?? null,
      episodes: metadata.episodes,
      episode_duration_min: metadata.episodeDurationMin,
      total_duration_min: metadata.totalDurationMin,
      genres: metadata.genres,
      aired_from: metadata.airedFrom ?? null,
      aired_to: metadata.airedTo ?? null,
      broadcast_day: metadata.broadcastDay ?? null,
      broadcast_time: metadata.broadcastTime ?? null,
      mal_season: metadata.malSeason ?? null,
      mal_year: metadata.malYear ?? null,
    })
    .eq("id", animeId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function updateAnimeRuntimeFields(
  animeId: string,
  runtime: {
    episodes: number | null;
    episodeDurationMin: number | null;
    totalDurationMin: number | null;
  },
): Promise<AnimeEntry> {
  const { data, error } = await supabase
    .from("anime")
    .update({
      episodes: runtime.episodes,
      episode_duration_min: runtime.episodeDurationMin,
      total_duration_min: runtime.totalDurationMin,
    })
    .eq("id", animeId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

/** Fetch and persist exact MAL runtime — never invents placeholder values. */
export async function ensureAnimeHasRuntime(
  anime: AnimeEntry,
): Promise<AnimeEntry> {
  const exact = getExactRuntime(anime);
  if (exact && !runtimeNeedsPersist(anime)) {
    return anime;
  }

  if (anime.malId && anime.malId > 0) {
    const details = await fetchMalAnimeDetails([anime.malId]);
    const mal = details.get(anime.malId);
    if (mal) {
      const merged = mergeMalRuntime(anime, mal);
      if (merged) {
        return updateAnimeRuntimeFields(anime.id, merged);
      }
    }
  }

  if (!anime.malId || anime.malId <= 0) {
    const enriched = await enrichAnimeFromMal(anime);
    const enrichedExact = getExactRuntime(enriched);
    if (enrichedExact) {
      return updateAnimeRuntimeFields(enriched.id, enrichedExact);
    }
    return enriched;
  }

  return anime;
}

export function applyAnimeMetadataPatch(
  prev: AnimeEntry[],
  patched: AnimeEntry[],
): AnimeEntry[] {
  if (prev.length === 0) {
    return patched;
  }

  const patchMap = new Map(patched.map((entry) => [entry.id, entry]));

  const merged = prev.map((entry) => {
    const update = patchMap.get(entry.id);
    if (!update) return entry;
    return {
      ...entry,
      title: update.title,
      titleEnglish: update.titleEnglish,
      seriesKey: update.seriesKey,
      malStatus: update.malStatus,
      malId: update.malId ?? entry.malId,
      anilistId: update.anilistId ?? entry.anilistId,
      episodes: update.episodes,
      episodeDurationMin: update.episodeDurationMin,
      totalDurationMin: update.totalDurationMin,
      genres: update.genres,
      airedFrom: update.airedFrom ?? entry.airedFrom,
      airedTo: update.airedTo ?? entry.airedTo,
      broadcastDay: update.broadcastDay ?? entry.broadcastDay,
      broadcastTime: update.broadcastTime ?? entry.broadcastTime,
      malSeason: update.malSeason ?? entry.malSeason,
      malYear: update.malYear ?? entry.malYear,
    };
  });

  const prevIds = new Set(prev.map((entry) => entry.id));
  const added = patched.filter((entry) => !prevIds.has(entry.id));
  added.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return [...added, ...merged];
}

export async function enrichAnimeFromMal(anime: AnimeEntry): Promise<AnimeEntry> {
  const needsMetadata = !anime.totalDurationMin || !anime.airedFrom;
  if (anime.malId && !needsMetadata) {
    return anime;
  }

  const results = await searchMalAnime(anime.title);
  const match =
    results.find((result) => result.malId === anime.malId) ?? results[0];

  if (!match) {
    return anime;
  }

  return updateAnimeMalMetadata(anime.id, {
    malId: match.malId,
    title: match.title,
    titleEnglish: match.titleEnglish,
    seriesKey: match.seriesKey,
    malStatus: match.malStatus,
    episodes: match.episodes,
    episodeDurationMin: match.episodeDurationMin,
    totalDurationMin: match.totalDurationMin,
    genres: match.genres,
    airedFrom: match.airedFrom,
    airedTo: match.airedTo,
    broadcastDay: match.broadcastDay,
    broadcastTime: match.broadcastTime,
    malSeason: match.malSeason,
    malYear: match.malYear,
  });
}

export async function enrichMissingMalMetadata(
  animeList: AnimeEntry[],
): Promise<AnimeEntry[]> {
  const missing = animeList.filter(
    (anime) =>
      !getExactRuntime(anime) ||
      !anime.airedFrom ||
      runtimeNeedsPersist(anime),
  );
  if (missing.length === 0) {
    return animeList;
  }

  const updated = new Map<string, AnimeEntry>();

  for (const anime of missing) {
    try {
      let enriched = anime;
      if (!getExactRuntime(anime) || !anime.airedFrom || !anime.malId) {
        enriched = await enrichAnimeFromMal(anime);
      }
      if (!getExactRuntime(enriched) || runtimeNeedsPersist(enriched)) {
        enriched = await ensureAnimeHasRuntime(enriched);
      }
      updated.set(anime.id, enriched);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch {
      updated.set(anime.id, anime);
    }
  }

  return animeList.map((anime) => updated.get(anime.id) ?? anime);
}

function metadataNeedsReconcile(
  anime: AnimeEntry,
  mal: {
    episodes: number | null;
    episodeDurationMin: number | null;
    totalDurationMin: number | null;
  },
): boolean {
  if (!getExactRuntime(anime)) return true;
  if (runtimeNeedsPersist(anime)) return true;
  const malExact = mergeMalRuntime(anime, mal);
  if (!malExact) return false;
  if (anime.episodes !== malExact.episodes) return true;
  if (anime.episodeDurationMin !== malExact.episodeDurationMin) return true;
  if (anime.totalDurationMin !== malExact.totalDurationMin) return true;
  return false;
}

/** Refresh episode counts and runtime from MAL (fixes inflated merge totals). */
export async function reconcileAnimeMetadata(
  animeList: AnimeEntry[],
): Promise<AnimeEntry[]> {
  const withMal = animeList.filter((anime) => anime.malId && anime.malId > 0);
  const updated = new Map<string, AnimeEntry>();

  if (withMal.length > 0) {
    const detailsMap = await fetchMalAnimeDetails(withMal.map((a) => a.malId!));

    for (const anime of withMal) {
      const mal = detailsMap.get(anime.malId!);
      if (!mal || !metadataNeedsReconcile(anime, mal)) continue;

      try {
        const merged = mergeMalRuntime(anime, mal);
        if (!merged) continue;

        const fixed = await updateAnimeMalMetadata(anime.id, {
          malId: mal.malId,
          title: mal.title,
          titleEnglish: mal.titleEnglish,
          seriesKey: mal.seriesKey,
          malStatus: mal.malStatus,
          episodes: merged.episodes,
          episodeDurationMin: merged.episodeDurationMin,
          totalDurationMin: merged.totalDurationMin,
          genres: mergeGenres(anime.genres, mal.genres),
          airedFrom: mal.airedFrom ?? anime.airedFrom,
          airedTo: mal.airedTo ?? anime.airedTo,
          broadcastDay: mal.broadcastDay ?? anime.broadcastDay,
          broadcastTime: mal.broadcastTime ?? anime.broadcastTime,
          malSeason: mal.malSeason ?? anime.malSeason,
          malYear: mal.malYear ?? anime.malYear,
        });
        updated.set(anime.id, fixed);
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch {
        // keep existing row
      }
    }
  }

  for (const anime of animeList) {
    if (updated.has(anime.id)) continue;
    if (!runtimeNeedsPersist(anime)) continue;
    try {
      const fixed = await ensureAnimeHasRuntime(anime);
      updated.set(anime.id, fixed);
    } catch {
      // keep existing row
    }
  }

  return animeList.map((anime) => updated.get(anime.id) ?? anime);
}

export async function moveAnimeToFolder(
  animeId: string,
  folderId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("anime")
    .update({ folder_id: folderId })
    .eq("id", animeId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function renameAnime(
  animeId: string,
  title: string,
): Promise<AnimeEntry> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title cannot be empty.");
  }

  const { data, error } = await supabase
    .from("anime")
    .update({ title: trimmed })
    .eq("id", animeId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function deleteAnime(animeId: string): Promise<void> {
  const { error } = await supabase.from("anime").delete().eq("id", animeId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateRatings(
  animeId: string,
  ratings: Record<string, number>,
): Promise<void> {
  const { error } = await supabase
    .from("anime")
    .update({ ratings })
    .eq("id", animeId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resetAllWatchProgress(): Promise<number> {
  const { data, error } = await supabase
    .from("anime")
    .update({
      member_statuses: {},
      ratings: {},
      watched_by: [],
    })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function clearAllAnimeFromWatchlist(): Promise<number> {
  const { data, error } = await supabase
    .from("anime")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export function subscribeToAnimeChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("anime-watchlist")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "anime" },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function countFinishedForMember(
  animeList: AnimeEntry[],
  memberName: string,
): number {
  return animeList.filter((anime) =>
    FINISHED_STATUSES.includes(getMemberStatus(anime.memberStatuses, memberName)),
  ).length;
}
