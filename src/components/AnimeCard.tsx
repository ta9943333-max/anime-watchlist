"use client";

import { FormEvent, useState } from "react";
import { FolderInput, Pencil, Star, Trash2, X, Check } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import {
  AnimeReleaseBadge,
  releaseFieldsFromAnime,
} from "@/components/AnimeReleaseBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  countFinishedMembers,
  getMemberStatus,
  isFinishedStatus,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import {
  getAverageRating,
  getDisplayTitle,
  sortMembersByName,
  type AnimeEntry,
  type Folder,
  type Member,
} from "@/lib/types";

type AnimeCardProps = {
  anime: AnimeEntry;
  members: Member[];
  folders: Folder[];
  currentUser: string;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onRenameAnime: (animeId: string, title: string) => Promise<void>;
  onDeleteAnime: (animeId: string) => Promise<void>;
  onRateAnime: (animeId: string, rating: number) => void;
  onOpenProfile: (name: string) => void;
};

const RATING_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);

export function AnimeCard({
  anime,
  members,
  folders,
  currentUser,
  onSetMyStatus,
  onMoveToFolder,
  onRenameAnime,
  onDeleteAnime,
  onRateAnime,
  onOpenProfile,
}: AnimeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(anime.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayTitle = getDisplayTitle(anime);
  const sortedMembers = sortMembersByName(members);
  const memberNames = sortedMembers.map((m) => m.name);
  const finishedCount = countFinishedMembers(anime.memberStatuses, memberNames);
  const myStatus = getMemberStatus(anime.memberStatuses, currentUser);
  const otherMembers = sortedMembers.filter((m) => m.name !== currentUser);
  const myRating = anime.ratings[currentUser] ?? 0;
  const { average, count } = getAverageRating(anime.ratings);

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
        `"${displayTitle}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`,
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
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-white">{displayTitle}</h3>
              {anime.episodes && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {anime.episodes} episodes
                  {anime.totalDurationMin
                    ? ` · ${Math.round((anime.totalDurationMin / 60) * 10) / 10}h`
                    : ""}
                </p>
              )}
              <div className="mt-2">
                <AnimeReleaseBadge info={releaseFieldsFromAnime(anime)} />
              </div>
            </div>
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

      {anime.genres.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {anime.genres.map((genre) => (
            <span
              key={genre}
              className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-xs text-slate-400"
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      <ProgressBar
        value={finishedCount}
        max={members.length}
        label="haben abgeschlossen"
      />

      <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-violet-500/30 bg-violet-600/10 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-violet-300">
              Dein Status (nur du kannst das ändern)
            </label>
            {myStatus !== "none" && <StatusBadge status={myStatus} />}
          </div>
          <select
            value={myStatus}
            onChange={(event) =>
              onSetMyStatus(anime.id, event.target.value as AnimeStatus)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/30"
          >
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-950 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-300">
              <Star className="h-3.5 w-3.5" />
              Deine Bewertung
            </label>
            {count > 0 && (
              <span className="text-xs text-slate-400">
                Ø {average} · {count} {count === 1 ? "Stimme" : "Stimmen"}
              </span>
            )}
          </div>
          <select
            value={myRating}
            onChange={(event) =>
              onRateAnime(anime.id, Number(event.target.value))
            }
            className="w-full rounded-xl border border-amber-500/30 bg-slate-950/80 px-3 py-2.5 text-sm text-amber-100 outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            <option value={0}>Keine Bewertung</option>
            {RATING_VALUES.map((value) => (
              <option key={value} value={value}>
                {value} / 10
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
                const rating = anime.ratings[member.name] ?? 0;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onOpenProfile(member.name)}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 transition hover:border-violet-500/40 hover:bg-violet-600/10"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      {member.name}
                    </span>
                    <StatusBadge status={status} compact />
                    {rating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-amber-300">
                        <Star className="h-3 w-3" />
                        {rating}
                      </span>
                    )}
                  </button>
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
