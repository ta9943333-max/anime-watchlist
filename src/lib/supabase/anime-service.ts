import { supabase } from "@/lib/supabase/client";
import type { AnimeRow } from "@/lib/supabase/database.types";
import type { AnimeEntry, Friend } from "@/lib/types";

function mapRow(row: AnimeRow): AnimeEntry {
  return {
    id: row.id,
    title: row.title,
    watchedBy: row.watched_by as Friend[],
    createdAt: row.created_at,
  };
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

export async function addAnime(title: string): Promise<AnimeEntry> {
  const { data, error } = await supabase
    .from("anime")
    .insert({ title, watched_by: [] })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function updateWatchedBy(
  animeId: string,
  watchedBy: Friend[],
): Promise<void> {
  const { error } = await supabase
    .from("anime")
    .update({ watched_by: watchedBy })
    .eq("id", animeId);

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
