import { useEffect, useRef, useState, type RefObject } from "react";

const INITIAL_COUNT = 16;
const BATCH_SIZE = 12;

/** Rendert Listen-Einträge stufenweise statt alle 200+ Karten auf einmal. */
export function useProgressiveRender<T>(items: T[]): {
  visibleItems: T[];
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
} {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [items]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) =>
            Math.min(count + BATCH_SIZE, items.length),
          );
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    sentinelRef,
  };
}
