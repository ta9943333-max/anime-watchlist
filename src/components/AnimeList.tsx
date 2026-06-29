"use client";

import { useCallback, useState } from "react";
import { Film } from "lucide-react";
import { LibraryAnimeEditor } from "@/components/LibraryAnimeEditor";
import { LibraryAnimeGrid } from "@/components/LibraryAnimeCard";
import type { AnimeStatus } from "@/lib/statuses";
import type { AnimeEntry, Folder, Member } from "@/lib/types";

type AnimeListProps = {
  animeList: AnimeEntry[];
  members: Member[];
  folders: Folder[];
  currentUser: string;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched: (animeId: string, episodesWatched: number) => void;
  onSetRewatchCount: (animeId: string, rewatchCount: number) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onRenameAnime: (animeId: string, title: string) => Promise<void>;
  onDeleteAnime: (animeId: string) => Promise<void>;
  onRateAnime: (animeId: string, rating: number) => void;
  onOpenProfile: (name: string) => void;
  emptyMessage?: string;
};

export function AnimeList({
  animeList,
  folders,
  currentUser,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
  onMoveToFolder,
  onDeleteAnime,
  onRateAnime,
  emptyMessage = "Keine Anime in dieser Ansicht.",
}: AnimeListProps) {
  const [editId, setEditId] = useState<string | null>(null);

  const editAnime = editId
    ? animeList.find((entry) => entry.id === editId)
    : undefined;

  const handleOpen = useCallback((id: string) => setEditId(id), []);

  if (animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
        <Film className="mb-3 h-10 w-10 text-[var(--text-dim)]" />
        <p className="text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <LibraryAnimeGrid
        animeList={animeList}
        currentUser={currentUser}
        onOpenAnime={handleOpen}
      />
      {editAnime && (
        <LibraryAnimeEditor
          anime={editAnime}
          folders={folders}
          currentUser={currentUser}
          onClose={() => setEditId(null)}
          onSetMyStatus={onSetMyStatus}
          onSetEpisodesWatched={onSetEpisodesWatched}
          onSetRewatchCount={onSetRewatchCount}
          onMoveToFolder={onMoveToFolder}
          onDeleteAnime={onDeleteAnime}
          onRateAnime={onRateAnime}
        />
      )}
    </>
  );
}
