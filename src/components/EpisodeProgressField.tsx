"use client";

import { useEffect, useState } from "react";
import { statusShowsEpisodeProgress, type AnimeStatus } from "@/lib/statuses";

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

  const max = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : undefined;

  useEffect(() => {
    if (isFocused) return;
    setDraft(formatDraft(episodesWatched));
  }, [episodesWatched, isFocused]);

  if (!statusShowsEpisodeProgress(status)) return null;

  function commitDraft(raw: string) {
    if (raw === "") {
      setDraft("");
      onEpisodesWatchedChange(0);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft("");
      onEpisodesWatchedChange(0);
      return;
    }

    const clamped = clampEpisodes(parsed, max);
    setDraft(clamped > 0 ? String(clamped) : "");
    onEpisodesWatchedChange(clamped);
  }

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-sky-300">
        Episodes watched
        {totalEpisodes ? ` (of ${totalEpisodes})` : ""}
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitDraft(draft);
        }}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, "");
          setDraft(raw);
        }}
        className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/60"
        placeholder={totalEpisodes ? `0 – ${totalEpisodes}` : "z. B. 12"}
      />
    </div>
  );
}
