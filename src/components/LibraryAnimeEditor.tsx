"use client";

import { useEffect } from "react";
import { Star, Trash2, X } from "lucide-react";
import { EpisodeProgressField } from "@/components/EpisodeProgressField";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import { RewatchCountField } from "@/components/RewatchCountField";
import { StatusBadge } from "@/components/StatusBadge";
import { resolveAnimeCoverUrl } from "@/lib/anime/cover";
import {
  getMemberEpisodesWatched,
  getMemberRewatchCount,
  getMemberStatus,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import { getDisplayTitle, type AnimeEntry, type Folder } from "@/lib/types";

const RATING_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);

type LibraryAnimeEditorProps = {
  anime: AnimeEntry;
  folders: Folder[];
  currentUser: string;
  malImageUrl?: string | null;
  onClose: () => void;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched: (animeId: string, episodesWatched: number) => void;
  onSetRewatchCount: (animeId: string, rewatchCount: number) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onDeleteAnime: (animeId: string) => Promise<void>;
  onRateAnime: (animeId: string, rating: number) => void;
};

export function LibraryAnimeEditor({
  anime,
  folders,
  currentUser,
  malImageUrl,
  onClose,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
  onMoveToFolder,
  onDeleteAnime,
  onRateAnime,
}: LibraryAnimeEditorProps) {
  const title = getDisplayTitle(anime);
  const myStatus = getMemberStatus(anime.memberStatuses, currentUser);
  const myEpisodesWatched =
    getMemberEpisodesWatched(anime.memberStatuses, currentUser) ?? 0;
  const myRewatchCount = getMemberRewatchCount(anime.memberStatuses, currentUser);
  const myRating = anime.ratings[currentUser] ?? 0;
  const cover = resolveAnimeCoverUrl({
    anilistId: anime.anilistId,
    malId: anime.malId,
    malImageUrl,
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="surface-card max-h-[92vh] w-full max-w-md overflow-y-auto sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg font-bold text-[var(--foreground)]">
              {title}
            </h2>
            {myStatus !== "none" && (
              <div className="mt-2">
                <StatusBadge status={myStatus} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-2 text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mx-auto mb-4 w-32">
            <LazyCoverImage
              src={cover}
              alt=""
              className="aspect-[2/3] w-full rounded object-cover"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Status
              </label>
              <select
                value={myStatus}
                onChange={(e) =>
                  onSetMyStatus(anime.id, e.target.value as AnimeStatus)
                }
                className="w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <EpisodeProgressField
              status={myStatus}
              totalEpisodes={anime.episodes}
              episodesWatched={myEpisodesWatched}
              onEpisodesWatchedChange={(value) =>
                onSetEpisodesWatched(anime.id, value)
              }
            />
            <RewatchCountField
              status={myStatus}
              rewatchCount={myRewatchCount}
              totalEpisodes={anime.episodes}
              onRewatchCountChange={(value) =>
                onSetRewatchCount(anime.id, value)
              }
            />

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-300">
                <Star className="h-3.5 w-3.5" />
                Bewertung
              </label>
              <select
                value={myRating || ""}
                onChange={(e) =>
                  onRateAnime(anime.id, Number(e.target.value) || 0)
                }
                className="w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
              >
                <option value="">Keine</option>
                {RATING_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}/10
                  </option>
                ))}
              </select>
            </div>

            {folders.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Ordner
                </label>
                <select
                  value={anime.folderId ?? ""}
                  onChange={(e) =>
                    onMoveToFolder(anime.id, e.target.value || null)
                  }
                  className="w-full rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
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

            <button
              type="button"
              onClick={() => void onDeleteAnime(anime.id).then(onClose)}
              className="flex w-full items-center justify-center gap-2 rounded border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Aus Liste entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
