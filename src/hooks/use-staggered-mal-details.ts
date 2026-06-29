import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMalAnimeDetails } from "@/lib/mal/jikan";

export type MalCardDetails = {
  imageUrl: string | null;
  synopsis: string | null;
  studios: string[];
  score: number | null;
};

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 350;

function uniqueSortedIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => id > 0))].sort((a, b) => a - b);
}

function pickNextBatch(
  allIds: number[],
  loaded: Set<number>,
  priority: Set<number>,
): number[] {
  const unloaded = allIds.filter((id) => !loaded.has(id));
  if (unloaded.length === 0) return [];
  const prioritized = unloaded.filter((id) => priority.has(id));
  const pool = prioritized.length > 0 ? prioritized : unloaded;
  return pool.slice(0, BATCH_SIZE);
}

/**
 * Lädt MAL-Details in kleinen Batches nacheinander.
 * Sichtbare Karten (priorityMalIds) werden bevorzugt.
 */
export function useStaggeredMalDetails(
  allMalIds: number[],
  priorityMalIds: number[] = [],
): Map<number, MalCardDetails> {
  const allIds = useMemo(() => uniqueSortedIds(allMalIds), [allMalIds]);
  const allIdsKey = allIds.join(",");
  const priorityKey = useMemo(
    () => uniqueSortedIds(priorityMalIds).join(","),
    [priorityMalIds],
  );

  const [detailsByMalId, setDetailsByMalId] = useState<
    Map<number, MalCardDetails>
  >(() => new Map());

  const loadedRef = useRef<Set<number>>(new Set());
  const runIdRef = useRef(0);

  useEffect(() => {
    if (allIds.length === 0) return;

    const runId = ++runIdRef.current;
    loadedRef.current = new Set(
      [...loadedRef.current].filter((id) => allIds.includes(id)),
    );

    let cancelled = false;

    const priority = new Set(
      priorityKey ? priorityKey.split(",").map(Number) : [],
    );

    void (async () => {
      while (!cancelled && runId === runIdRef.current) {
        const batch = pickNextBatch(allIds, loadedRef.current, priority);
        if (batch.length === 0) break;

        for (const id of batch) loadedRef.current.add(id);

        try {
          const map = await fetchMalAnimeDetails(batch);
          if (cancelled || runId !== runIdRef.current) break;
          setDetailsByMalId((prev) => {
            const next = new Map(prev);
            for (const [malId, item] of map) {
              next.set(malId, {
                imageUrl: item.imageUrl,
                synopsis: item.synopsis,
                studios: item.studios,
                score: item.score,
              });
            }
            return next;
          });
        } catch {
          // Weiter mit nächstem Batch
        }

        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allIdsKey, allIds, priorityKey]);

  return detailsByMalId;
}
