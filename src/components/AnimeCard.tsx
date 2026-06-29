"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  FolderInput,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { AnimeLiveChartCard } from "@/components/AnimeLiveChartCard";
import { EpisodeProgressField } from "@/components/EpisodeProgressField";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { RewatchCountField } from "@/components/RewatchCountField";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchMalAnimeDetails, type MalSearchResult } from "@/lib/mal/jikan";
import { anilistCoverUrl } from "@/lib/anime/cover";
import {
  countFinishedMembers,
  getMemberStatus,
  getMemberEpisodesWatched,
  getMemberRewatchCount,
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

type MalCardDetails = Pick<
  MalSearchResult,
  "imageUrl" | "synopsis" | "studios" | "score"
>;

type AnimeCardProps = {
  anime: AnimeEntry;
  members: Member[];
  folders: Folder[];
  currentUser: string;
  /** Von AnimeList gestaffelt geladen — kein eigener API-Call pro Karte */
  malDetails?: MalCardDetails;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched: (animeId: string, episodesWatched: number) => void;
  onSetRewatchCount: (animeId: string, rewatchCount: number) => void;
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
  malDetails: malDetailsProp,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [malDetailsLocal, setMalDetailsLocal] = useState<MalCardDetails | null>(
    null,
  );

  const malDetails = malDetailsProp ?? malDetailsLocal;

  const displayTitle = getDisplayTitle(anime);
  const sortedMembers = sortMembersByName(members);
  const memberNames = sortedMembers.map((m) => m.name);
  const finishedCount = countFinishedMembers(anime.memberStatuses, memberNames);
  const myStatus = getMemberStatus(anime.memberStatuses, currentUser);
  const myEpisodesWatched =
    getMemberEpisodesWatched(anime.memberStatuses, currentUser) ?? 0;
  const myRewatchCount = getMemberRewatchCount(anime.memberStatuses, currentUser);
  const otherMembers = sortedMembers.filter((m) => m.name !== currentUser);
  const myRating = anime.ratings[currentUser] ?? 0;
  const { average, count } = getAverageRating(anime.ratings);

  useEffect(() => {
    if (malDetailsProp != null) return;
    if (!anime.malId || anime.malId <= 0) return;

    let cancelled = false;
    void fetchMalAnimeDetails([anime.malId]).then((map) => {
      if (cancelled) return;
      const details = map.get(anime.malId!);
      if (!details) return;
      setMalDetailsLocal({
        imageUrl: details.imageUrl,
        synopsis: details.synopsis,
        studios: details.studios,
        score: details.score,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [anime.malId, malDetailsProp]);

  const placeholderCover =
    anime.anilistId && anime.anilistId > 0
      ? anilistCoverUrl(anime.anilistId, "medium")
      : null;

  const cardData = useMemo(
    () => ({
      title: displayTitle,
      genres: anime.genres,
      malId: anime.malId,
      anilistId: anime.anilistId,
      imageUrl: malDetails?.imageUrl ?? placeholderCover,
      studios: malDetails?.studios ?? [],
      score: malDetails?.score ?? null,
      episodes: anime.episodes,
      episodeDurationMin: anime.episodeDurationMin,
      synopsis: malDetails?.synopsis ?? null,
      airedFrom: anime.airedFrom,
      airedTo: anime.airedTo,
      broadcastDay: anime.broadcastDay,
      broadcastTime: anime.broadcastTime,
      malSeason: anime.malSeason,
      malYear: anime.malYear,
      malStatus: anime.malStatus,
    }),
    [anime, displayTitle, malDetails, placeholderCover],
  );

  const accentClassName = isFinishedStatus(myStatus)
    ? "ring-1 ring-emerald-500/25"
    : myStatus !== "none"
      ? "ring-1 ring-violet-500/20"
      : undefined;

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
    <>
    <AnimeLiveChartCard
      layout="poster"
      anime={cardData}
      onCoverClick={() => setDetailOpen(true)}
      enableHoverCard={false}
      accentClassName={accentClassName}
      headerRight={
        <>
          {myStatus !== "none" && <StatusBadge status={myStatus} />}
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-violet-500/40 hover:text-violet-300"
                title="Umbenennen"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                title="Löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </>
      }
      actions={
        <div className="space-y-2">
          {isEditing && (
            <form
              onSubmit={handleRenameSubmit}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-950/20 p-2"
            >
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={120}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <button
                type="submit"
                disabled={isSaving || !editTitle.trim()}
                className="rounded-lg border border-emerald-500/40 p-1.5 text-emerald-300 transition hover:bg-emerald-950/40 disabled:opacity-40"
                title="Speichern"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(anime.title);
                }}
                className="rounded-lg border border-slate-700 p-1.5 text-slate-400 transition hover:bg-slate-800"
                title="Abbrechen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          <ProgressBar
            value={finishedCount}
            max={members.length}
            label="haben abgeschlossen"
          />

          <div className="grid gap-2">
            <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-2.5">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-violet-300">
                Dein Status
              </label>
              <select
                value={myStatus}
                onChange={(event) =>
                  onSetMyStatus(anime.id, event.target.value as AnimeStatus)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
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
              <EpisodeProgressField
                status={myStatus}
                totalEpisodes={anime.episodes}
                episodesWatched={myEpisodesWatched}
                compact
                onEpisodesWatchedChange={(value) =>
                  onSetEpisodesWatched(anime.id, value)
                }
              />
              <RewatchCountField
                status={myStatus}
                rewatchCount={myRewatchCount}
                totalEpisodes={anime.episodes}
                compact
                onRewatchCountChange={(value) =>
                  onSetRewatchCount(anime.id, value)
                }
              />
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-300">
                  <Star className="h-3.5 w-3.5" />
                  Deine Bewertung
                </label>
                {count > 0 && (
                  <span className="text-xs text-slate-400">
                    Ø {average} · {count}
                  </span>
                )}
              </div>
              <select
                value={myRating}
                onChange={(event) =>
                  onRateAnime(anime.id, Number(event.target.value))
                }
                className="w-full rounded-lg border border-amber-500/30 bg-slate-950/80 px-2 py-1.5 text-xs text-amber-100 outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value={0}>Keine Bewertung</option>
                {RATING_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value} / 10
                  </option>
                ))}
              </select>
            </div>
          </div>

          {otherMembers.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Andere in der Gruppe
              </p>
              <div className="flex flex-wrap gap-2">
                {otherMembers.map((member) => {
                  const status = getMemberStatus(
                    anime.memberStatuses,
                    member.name,
                  );
                  const rating = anime.ratings[member.name] ?? 0;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onOpenProfile(member.name)}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 transition hover:border-violet-500/40 hover:bg-violet-600/10"
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
      }
      footerExtra={
        folders.length > 0 ? (
          <div className="flex items-center gap-2">
            <FolderInput className="h-4 w-4 shrink-0 text-slate-500" />
            <select
              value={anime.folderId ?? ""}
              onChange={(event) =>
                onMoveToFolder(anime.id, event.target.value || null)
              }
              className="rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-violet-500/50"
            >
              <option value="">Allgemeine Liste</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    />
    {detailOpen && (
      <MediaDetailModal
        anilistId={anime.anilistId}
        malId={anime.malId}
        fallbackTitle={displayTitle}
        onClose={() => setDetailOpen(false)}
      />
    )}
    </>
  );
}
