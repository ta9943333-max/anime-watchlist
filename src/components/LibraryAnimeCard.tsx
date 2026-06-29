"use client";

import { memo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import { buildCoverFallbacks } from "@/lib/anime/cover";
import { getMemberEpisodesWatched, getMemberStatus } from "@/lib/statuses";
import { getDisplayTitle, type AnimeEntry } from "@/lib/types";

type LibraryAnimeCardProps = {
  anime: AnimeEntry;
  currentUser: string;
  onOpen: (animeId: string) => void;
};

function LibraryAnimeCardInner({
  anime,
  currentUser,
  onOpen,
}: LibraryAnimeCardProps) {
  const title = getDisplayTitle(anime);
  const status = getMemberStatus(anime.memberStatuses, currentUser);
  const rating = anime.ratings[currentUser];
  const episodesWatched = getMemberEpisodesWatched(
    anime.memberStatuses,
    currentUser,
  );
  const coverSources = buildCoverFallbacks({
    anilistId: anime.anilistId,
    malId: anime.malId,
  });
  const cover = coverSources[0] ?? null;

  const progressLabel =
    status !== "none" &&
    episodesWatched != null &&
    episodesWatched > 0 &&
    anime.episodes
      ? `${episodesWatched}/${anime.episodes}`
      : null;

  return (
    <article
      className="library-card group cursor-pointer"
      onClick={() => onOpen(anime.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(anime.id);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative overflow-hidden rounded-[3px] bg-[var(--surface-elevated)]">
        {cover ? (
          <LazyCoverImage
            src={cover}
            fallbacks={coverSources.slice(1)}
            alt=""
            className="aspect-[2/3] w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center">
            <Sparkles className="h-6 w-6 text-[var(--accent)]/40" />
          </div>
        )}
        {rating != null && rating > 0 && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/85 px-1 py-0.5 text-[10px] font-bold text-[var(--score)]">
            ★ {rating}
          </span>
        )}
        {progressLabel && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1 py-0.5 text-[10px] font-medium text-white">
            {progressLabel}
          </span>
        )}
        {status !== "none" && (
          <div className="absolute left-1 top-1 scale-90 origin-top-left">
            <StatusBadge status={status} />
          </div>
        )}
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--accent)]">
        {title}
      </h3>
    </article>
  );
}

export const LibraryAnimeCard = memo(LibraryAnimeCardInner);

export function LibraryAnimeGrid({
  animeList,
  currentUser,
  onOpenAnime,
}: {
  animeList: AnimeEntry[];
  currentUser: string;
  onOpenAnime: (animeId: string) => void;
}) {
  const handleOpen = useCallback(
    (id: string) => onOpenAnime(id),
    [onOpenAnime],
  );

  return (
    <div className="library-grid">
      {animeList.map((anime) => (
        <LibraryAnimeCard
          key={anime.id}
          anime={anime}
          currentUser={currentUser}
          onOpen={handleOpen}
        />
      ))}
    </div>
  );
}
