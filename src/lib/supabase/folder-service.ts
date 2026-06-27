import { supabase } from "@/lib/supabase/client";
import type { Folder } from "@/lib/types";

type FolderRow = {
  id: string;
  name: string;
  created_at: string;
};

function mapRow(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data as FolderRow[]).map(mapRow);
}

export async function createFolder(name: string): Promise<Folder> {
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from("folders")
    .insert({ name: trimmed })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message.includes("does not exist")
        ? "Ordner-Tabelle fehlt. Bitte add_folders.sql in Supabase ausführen."
        : error.message,
    );
  }

  return mapRow(data as FolderRow);
}

export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from("folders").delete().eq("id", folderId);

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToFolderChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("anime-watchlist-folders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "folders" },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
