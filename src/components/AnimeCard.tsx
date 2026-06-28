"use client";

import { FormEvent, useState } from "react";
import { FolderInput, Pencil, Trash2, X, Check } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import {
  countFinishedMembers,
  getMemberStatus,
  getStatusMeta,
  isFinishedStatus,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import { sortMembersByName, type AnimeEntry, type Folder, type Member } from "@/lib/types";

type AnimeCardProps = {
  anime: AnimeEntry;
  members: Member[];
  folders: Folder[];
  currentUser: string;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onRenameAnime: (animeId: string, title: string) => Promise<void>;
  onDeleteAnime: (animeId: string) => Promise<void>;
};

export function AnimeCard({
  anime,
  members,
  folders,
  currentUser,
  onSetMyStatus,
  onMoveToFolder,
  onRenameAnime,
  onDeleteAnime,
}: AnimeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(anime.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedMembers = sortMembersByName(members);
  const memberNames = sortedMembers.map((m) => m.name);
  const finishedCount = countFinishedMembers(anime.memberStatuses, memberNames);
  const myStatus = getMemberStatus(anime.memberStatuses, currentUser);
  const myMeta = getStatusMeta(myStatus);
  const otherMembers = sortedMembers.filter((m) => m.name !== currentUser);

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === anime.title) {
      setIsEditing(false);
      setEditTitle(anime.title);
      return;
    }

    setIsSaving(true);
    try {
      await onRenameAnime(anime.id, trimmed);
      setIsEditing(false);
    } catch {
      setEditTitle(anime.title);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `"${anime.title}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteAnime(anime.id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article
      className={`rounded-xl border p-5 transition-all ${
        isFinishedStatus(myStatus)
          ? "border-emerald-500/30 bg-emerald-950/20"
          : myStatus !== "none"
            ? "border-violet-500/20 bg-slate-900/50"
            : "border-slate-800/80 bg-slate-900/50"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        {isEditing ? (
          <form
            onSubmit={handleRenameSubmit}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <input
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              maxLength={120}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-violet-500/40 bg-slate-950/80 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <button
              type="submit"
              disabled={isSaving || !editTitle.trim()}
              className="rounded-lg border border-emerald-500/40 p-2 text-emerald-300 transition hover:bg-emerald-950/40 disabled:opacity-40"
              title="Speichern"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(anime.title);
              }}
              className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:bg-slate-800"
              title="Abbrechen"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1 text-lg font-semibold text-white">
              {anime.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {myStatus !== "none" && <StatusBadge status={myStatus} />}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-violet-500/40 hover:text-violet-300"
                title="Umbenennen"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                title="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <ProgressBar
        value={finishedCount}
        max={members.length}
        label="haben abgeschlossen"
      />

      <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-violet-500/30 bg-violet-600/10 p-4">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-violet-300">
            Dein Status (nur du kannst das ändern)
          </label>
          <select
            value={myStatus}
            onChange={(event) =>
              onSetMyStatus(anime.id, event.target.value as AnimeStatus)
            }
            className={`w-full rounded-xl border bg-slate-950/80 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 ${myMeta.color}`}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {otherMembers.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Andere in der Gruppe
            </p>
            <div className="flex flex-wrap gap-2">
              {otherMembers.map((member) => {
                const status = getMemberStatus(anime.memberStatuses, member.name);

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      {member.name}
                    </span>
                    <StatusBadge status={status} compact />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {folders.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <FolderInput className="h-4 w-4 shrink-0 text-slate-500" />
          <select
            value={anime.folderId ?? ""}
            onChange={(event) =>
              onMoveToFolder(anime.id, event.target.value || null)
            }
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500/50"
          >
            <option value="">Allgemeine Liste</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}
