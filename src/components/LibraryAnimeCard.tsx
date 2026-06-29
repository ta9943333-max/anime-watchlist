"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import { StatusBadge } from "@/components/StatusBadge";
import { resolveAnimeCoverUrl } from "@/lib/anime/cover";
import { getMemberEpisodesWatched, getMemberStatus } from "@/lib/statuses";
import { getDisplayTitle, type AnimeEntry } from "@/lib/types";

type LibraryAnimeCardProps = {
  anime: AnimeEntry;
  currentUser: string;
  malImageUrl?: string | null;
  onOpen: (animeId: string) => void;
};

function LibraryAnimeCardInner({
  anime,
  currentUser,
  malImageUrl,
  onOpen,
}: LibraryAnimeCardProps) {
  const title = getDisplayTitle(anime);
  const status = getMemberStatus(anime.memberStatuses, currentUser);
  const rating = anime.ratings[currentUser];
  const episodesWatched = getMemberEpisodesWatched(
    anime.memberStatuses,
    currentUser,
  );
  const cover = resolveAnimeCoverUrl({
    anilistId: anime.anilistId,
    malId: anime.malId,
    malImageUrl,
  });

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
        <LazyCoverImage
          src={cover}
          alt=""
          className="aspect-[2/3] w-full object-cover transition duration-200 group-hover:scale-[1.03]"
        />
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

const INITIAL_BATCH = 60;
const BATCH_SIZE = 48;

export function LibraryAnimeGrid({
  animeList,
  currentUser,
  malImages,
  onOpenAnime,
}: {
  animeList: AnimeEntry[];
  currentUser: string;
  malImages: ReadonlyMap<number, string>;
  onOpenAnime: (animeId: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [animeList]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= animeList.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) =>
            Math.min(count + BATCH_SIZE, animeList.length),
          );
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [animeList.length, visibleCount]);

  const visible = animeList.slice(0, visibleCount);
  const handleOpen = useCallback(
    (id: string) => onOpenAnime(id),
    [onOpenAnime],
  );

  return (
    <>
      <div className="library-grid">
        {visible.map((anime) => (
          <LibraryAnimeCard
            key={anime.id}
            anime={anime}
            currentUser={currentUser}
            malImageUrl={
              anime.malId ? malImages.get(anime.malId) ?? null : null
            }
            onOpen={handleOpen}
          />
        ))}
      </div>
      {visibleCount < animeList.length && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      )}
    </>
  );
}
