import { searchMalAnime } from "@/lib/mal/jikan";
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

function mapRow(row: AnimeRow): AnimeEntry {
  return {
    id: row.id,
    title: row.title,
    memberStatuses: parseMemberStatuses(row),
    folderId: row.folder_id ?? null,
    createdAt: row.created_at,
    malId: row.mal_id ?? null,
    episodes: row.episodes ?? null,
    episodeDurationMin: row.episode_duration_min ?? null,
    totalDurationMin: row.total_duration_min ?? null,
    genres: row.genres ?? [],
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
  const { data, error } = await supabase
    .from("anime")
    .insert({
      title: payload.title,
      watched_by: [],
      member_statuses: {},
      folder_id: payload.folderId ?? null,
      mal_id: payload.malId ?? null,
      episodes: payload.episodes ?? null,
      episode_duration_min: payload.episodeDurationMin ?? null,
      total_duration_min: payload.totalDurationMin ?? null,
      genres: payload.genres ?? [],
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
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
    episodes: number | null;
    episodeDurationMin: number | null;
    totalDurationMin: number | null;
    genres: string[];
  },
): Promise<AnimeEntry> {
  const { data, error } = await supabase
    .from("anime")
    .update({
      mal_id: metadata.malId,
      episodes: metadata.episodes,
      episode_duration_min: metadata.episodeDurationMin,
      total_duration_min: metadata.totalDurationMin,
      genres: metadata.genres,
    })
    .eq("id", animeId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function enrichAnimeFromMal(anime: AnimeEntry): Promise<AnimeEntry> {
  if (anime.malId && anime.totalDurationMin) {
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
    episodes: match.episodes,
    episodeDurationMin: match.episodeDurationMin,
    totalDurationMin: match.totalDurationMin,
    genres: match.genres,
  });
}

export async function enrichMissingMalMetadata(
  animeList: AnimeEntry[],
): Promise<AnimeEntry[]> {
  const missing = animeList.filter((anime) => !anime.totalDurationMin);
  if (missing.length === 0) {
    return animeList;
  }

  const updated = new Map<string, AnimeEntry>();

  for (const anime of missing) {
    try {
      const enriched = await enrichAnimeFromMal(anime);
      updated.set(anime.id, enriched);
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch {
      updated.set(anime.id, anime);
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
