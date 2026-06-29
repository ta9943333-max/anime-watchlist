"use client";

import { useMemo } from "react";
import { Film } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import { ANIME_CARD_GRID } from "@/components/AnimeLiveChartCard";
import { useProgressiveRender } from "@/hooks/use-progressive-render";
import { useStaggeredMalDetails } from "@/hooks/use-staggered-mal-details";
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
  members,
  folders,
  currentUser,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
  onMoveToFolder,
  onRenameAnime,
  onDeleteAnime,
  onRateAnime,
  onOpenProfile,
  emptyMessage = "Keine Anime in dieser Ansicht.",
}: AnimeListProps) {
  const { visibleItems, hasMore, sentinelRef } =
    useProgressiveRender(animeList);

  const allMalIds = useMemo(
    () =>
      animeList
        .map((anime) => anime.malId)
        .filter((id): id is number => id != null && id > 0),
    [animeList],
  );

  const priorityMalIds = useMemo(
    () =>
      visibleItems
        .map((anime) => anime.malId)
        .filter((id): id is number => id != null && id > 0),
    [visibleItems],
  );

  const malDetailsById = useStaggeredMalDetails(allMalIds, priorityMalIds);

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
      <div className={ANIME_CARD_GRID}>
        {visibleItems.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            members={members}
            folders={folders}
            currentUser={currentUser}
            malDetails={
              anime.malId && anime.malId > 0
                ? malDetailsById.get(anime.malId)
                : undefined
            }
            onSetMyStatus={onSetMyStatus}
            onSetEpisodesWatched={onSetEpisodesWatched}
            onSetRewatchCount={onSetRewatchCount}
            onMoveToFolder={onMoveToFolder}
            onRenameAnime={onRenameAnime}
            onDeleteAnime={onDeleteAnime}
            onRateAnime={onRateAnime}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-10 text-sm text-[var(--text-muted)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            Weitere Anime werden geladen…
          </div>
        </div>
      )}
    </>
  );
}
