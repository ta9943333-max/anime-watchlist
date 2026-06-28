"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Folder, FolderPlus, Trash2 } from "lucide-react";
import { AnimeForm } from "@/components/AnimeForm";
import { AnimeList } from "@/components/AnimeList";
import type { AnimeStatus } from "@/lib/statuses";
import type { AddAnimePayload, AnimeEntry, Folder as FolderType, Member } from "@/lib/types";

type FolderSectionProps = {
  folders: FolderType[];
  animeList: AnimeEntry[];
  openFolderId: string | null;
  openFolderAnime: AnimeEntry[];
  members: Member[];
  currentUser: string;
  onOpenFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onAddAnimeToFolder: (payload: AddAnimePayload, folderId: string) => Promise<void>;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onRenameAnime: (animeId: string, title: string) => Promise<void>;
  onDeleteAnime: (animeId: string) => Promise<void>;
  onRateAnime: (animeId: string, rating: number) => void;
};

export function FolderSection({
  folders,
  animeList,
  openFolderId,
  openFolderAnime,
  members,
  currentUser,
  onOpenFolder,
  onCreateFolder,
  onDeleteFolder,
  onAddAnimeToFolder,
  onSetMyStatus,
  onMoveToFolder,
  onRenameAnime,
  onDeleteAnime,
  onRateAnime,
}: FolderSectionProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateFolder(trimmed);
      setNewFolderName("");
    } finally {
      setIsCreating(false);
    }
  }

  if (openFolder) {
    return (
      <section className="mb-10 rounded-2xl border border-violet-500/20 bg-slate-900/40 p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenFolder(null)}
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
          <button
            type="button"
            onClick={() => void onDeleteFolder(openFolder.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 transition hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Ordner löschen
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{openFolder.name}</h2>
            <p className="text-sm text-slate-400">
              {openFolderAnime.length} Anime in diesem Ordner
            </p>
          </div>
        </div>

        <div className="mb-5">
          <AnimeForm
            onAdd={(payload) => void onAddAnimeToFolder(payload, openFolder.id)}
            folderId={openFolder.id}
            placeholder={`Add anime to „${openFolder.name}" …`}
          />
        </div>

        <AnimeList
          animeList={openFolderAnime}
          members={members}
          folders={folders}
          currentUser={currentUser}
          onSetMyStatus={onSetMyStatus}
          onMoveToFolder={onMoveToFolder}
          onRenameAnime={onRenameAnime}
          onDeleteAnime={onDeleteAnime}
          onRateAnime={onRateAnime}
          emptyMessage="Noch keine Anime in diesem Ordner."
        />
      </section>
    );
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ordner</h2>
        <span className="text-xs text-slate-500">Tippe zum Öffnen</span>
      </div>

      {folders.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {folders.map((folder) => {
            const count = animeList.filter((a) => a.folderId === folder.id).length;

            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => onOpenFolder(folder.id)}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-violet-500/40 hover:bg-violet-600/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
                  <Folder className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">{folder.name}</p>
                  <p className="text-xs text-slate-500">
                    {count} Anime · Ordner öffnen
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleCreateFolder}
        className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-800 p-4 sm:flex-row"
      >
        <input
          type="text"
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          placeholder="Neuer Ordner, z. B. Must Watch …"
          maxLength={40}
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-violet-500/60"
        />
        <button
          type="submit"
          disabled={!newFolderName.trim() || isCreating}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-5 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-600/30 disabled:opacity-40"
        >
          <FolderPlus className="h-4 w-4" />
          Ordner erstellen
        </button>
      </form>
    </section>
  );
}
