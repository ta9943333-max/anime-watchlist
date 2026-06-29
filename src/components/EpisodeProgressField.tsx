"use client";

import { useEffect, useRef, useState } from "react";
import { EpisodeIncrementButton } from "@/components/ui/EpisodeIncrementButton";
import { statusShowsEpisodeProgress, type AnimeStatus } from "@/lib/statuses";

const DEBOUNCE_MS = 200;

type EpisodeProgressFieldProps = {
  status: AnimeStatus;
  totalEpisodes: number | null;
  episodesWatched: number;
  onEpisodesWatchedChange: (episodesWatched: number) => void;
  compact?: boolean;
};

function formatDraft(episodesWatched: number): string {
  return episodesWatched > 0 ? String(episodesWatched) : "";
}

function clampEpisodes(value: number, max?: number): number {
  const clamped = Math.max(0, value);
  return max != null ? Math.min(max, clamped) : clamped;
}

export function EpisodeProgressField({
  status,
  totalEpisodes,
  episodesWatched,
  onEpisodesWatchedChange,
  compact = false,
}: EpisodeProgressFieldProps) {
  const [draft, setDraft] = useState(() => formatDraft(episodesWatched));
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const max = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : undefined;

  useEffect(() => {
    if (isFocused) return;
    setDraft(formatDraft(episodesWatched));
  }, [episodesWatched, isFocused]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  if (!statusShowsEpisodeProgress(status)) return null;

  function emitChange(value: number, immediate = false) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (immediate) {
      onEpisodesWatchedChange(value);
      return;
    }
    debounceRef.current = setTimeout(() => {
      onEpisodesWatchedChange(value);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }

  function commitDraft(raw: string, immediate = true) {
    if (raw === "") {
      setDraft("");
      emitChange(0, immediate);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft("");
      emitChange(0, immediate);
      return;
    }

    const clamped = clampEpisodes(parsed, max);
    setDraft(clamped > 0 ? String(clamped) : "");
    emitChange(clamped, immediate);
  }

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-sky-300">
        Gesehene Folgen
        {totalEpisodes ? ` (von ${totalEpisodes})` : ""}
      </label>
      <div className="flex max-w-xs items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            commitDraft(draft, true);
          }}
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, "");
            setDraft(raw);
            if (raw === "") {
              emitChange(0, false);
              return;
            }
            const parsed = Number.parseInt(raw, 10);
            if (!Number.isNaN(parsed)) {
              emitChange(clampEpisodes(parsed, max), false);
            }
          }}
          className="w-full min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/60"
          placeholder={totalEpisodes ? `0 – ${totalEpisodes}` : "z. B. 12"}
        />
        <EpisodeIncrementButton
          current={episodesWatched}
          max={max}
          onIncrement={(next) => {
            setDraft(next > 0 ? String(next) : "");
            emitChange(next, true);
          }}
        />
      </div>
    </div>
  );
}
