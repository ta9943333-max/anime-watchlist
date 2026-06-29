"use client";

import Link from "next/link";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import type { AnilistMediaListEntry } from "@/lib/anilist/types";
import { pickMediaTitle } from "@/lib/anilist/types";

type AniListMediaCardProps = {
  entry: AnilistMediaListEntry;
};

export function AniListMediaCard({ entry }: AniListMediaCardProps) {
  const media = entry.media;
  const title = pickMediaTitle(media.title);
  const cover =
    media.coverImage?.large ?? media.coverImage?.medium ?? undefined;
  const total = media.episodes ?? 0;
  const progress = entry.progress ?? 0;
  const score =
    entry.score != null && entry.score > 0 ? String(entry.score) : null;

  return (
    <Link
      href={`/anime/${media.id}`}
      className="group block overflow-hidden rounded-[var(--border-radius)] bg-[rgb(var(--color-foreground))] transition hover:ring-2 hover:ring-[rgb(var(--color-primary))]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <LazyCoverImage
          src={cover}
          alt={title}
          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
        />
        {score && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-[rgb(var(--color-accent))]">
            {score}
          </span>
        )}
        {total > 0 && (
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[11px] text-white">
            {progress}/{total}
          </span>
        )}
      </div>
      <p className="line-clamp-2 px-1.5 py-2 text-xs font-medium text-[rgb(var(--color-text))] group-hover:text-white">
        {title}
      </p>
    </Link>
  );
}
