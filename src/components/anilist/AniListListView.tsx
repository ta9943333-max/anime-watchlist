"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SkeletonCardGrid } from "@/components/ui/SkeletonCard";
import { AniListMediaCard } from "@/components/anilist/AniListMediaCard";
import { AniListStatusTabs } from "@/components/anilist/AniListStatusTabs";
import { fetchMediaListCollectionClient } from "@/lib/anilist/client-api";
import type {
  AnilistMediaListEntry,
  AnilistMediaListGroup,
  MediaListStatus,
} from "@/lib/anilist/types";
import { MEDIA_LIST_STATUSES } from "@/lib/anilist/types";
import type { ScoreFormat } from "@/lib/anilist/rating";
import { useProgressiveRender } from "@/hooks/use-progressive-render";

type AniListListViewProps = {
  userName: string;
  status: MediaListStatus;
  scoreFormat?: ScoreFormat;
};

export function AniListListView({
  userName,
  status,
  scoreFormat = "POINT_10_DECIMAL",
}: AniListListViewProps) {
  const [entries, setEntries] = useState<AnilistMediaListEntry[]>([]);
  const [counts, setCounts] = useState<Partial<Record<MediaListStatus, number>>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const countResults = await Promise.all(
        MEDIA_LIST_STATUSES.map(async (s) => {
          const data = await fetchMediaListCollectionClient(userName, s);
          const lists = (data.MediaListCollection as { lists: AnilistMediaListGroup[] })
            ?.lists;
          const count =
            lists?.reduce((sum, list) => sum + list.entries.length, 0) ?? 0;
          return [s, count] as const;
        }),
      );
      setCounts(Object.fromEntries(countResults));

      const data = await fetchMediaListCollectionClient(userName, status);
      const lists = (data.MediaListCollection as { lists: AnilistMediaListGroup[] })
        ?.lists;
      const allEntries = lists?.flatMap((list) => list.entries) ?? [];
      setEntries(allEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [userName, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        pickTitle(a).localeCompare(pickTitle(b), undefined, {
          sensitivity: "base",
        }),
      ),
    [entries],
  );

  const { visibleItems, hasMore, sentinelRef } = useProgressiveRender(sorted);

  if (loading && entries.length === 0) {
    return (
      <>
        <AniListStatusTabs userName={userName} active={status} />
        <SkeletonCardGrid count={16} />
      </>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-[rgb(var(--color-red))]/40 bg-[rgb(var(--color-foreground))] p-6 text-center text-[rgb(var(--color-red))]">
        {error}
      </div>
    );
  }

  return (
    <>
      <AniListStatusTabs userName={userName} active={status} counts={counts} />
      {sorted.length === 0 ? (
        <p className="py-16 text-center text-[rgb(var(--color-text-light))]">
          Keine Einträge in dieser Liste.
        </p>
      ) : (
        <>
          <div className="library-grid">
            {visibleItems.map((entry) => (
              <AniListMediaCard key={entry.id} entry={entry} />
            ))}
          </div>
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex justify-center py-8 text-sm text-[rgb(var(--color-text-light))]"
            >
              Weitere werden geladen…
            </div>
          )}
        </>
      )}
    </>
  );
}

function pickTitle(entry: AnilistMediaListEntry): string {
  return (
    entry.media.title.english?.trim() ||
    entry.media.title.romaji?.trim() ||
    ""
  );
}
