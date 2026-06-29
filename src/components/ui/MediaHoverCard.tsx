"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const HOVER_DELAY_MS = 250;

type MediaHoverCardProps = {
  children: ReactNode;
  title: string;
  synopsis?: string | null;
  genres?: string[];
  score?: number | null;
  episodes?: number | null;
  disabled?: boolean;
};

export function MediaHoverCard({
  children,
  title,
  synopsis,
  genres = [],
  score,
  episodes,
  disabled = false,
}: MediaHoverCardProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function show() {
    if (disabled) return;
    clearTimer();
    timerRef.current = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
  }

  function hide() {
    clearTimer();
    setVisible(false);
  }

  useEffect(() => () => clearTimer(), []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && !disabled && (
        <div
          className="media-hover-card pointer-events-none absolute left-1/2 top-0 z-50 w-64 -translate-x-1/2 -translate-y-[calc(100%+8px)] p-3"
          role="tooltip"
        >
          <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
            {title}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
            {score != null && score > 0 && (
              <span className="text-primary font-semibold">
                ★ {score.toFixed(1)}
              </span>
            )}
            {episodes != null && episodes > 0 && (
              <span>{episodes} Folgen</span>
            )}
          </div>
          {genres.length > 0 && (
            <p className="mt-1 line-clamp-1 text-[11px] text-[var(--text-dim)]">
              {genres.slice(0, 4).join(" · ")}
            </p>
          )}
          {synopsis && (
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-[var(--text-muted)]">
              {synopsis}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
