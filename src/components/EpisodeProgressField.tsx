"use client";

import { statusShowsEpisodeProgress, type AnimeStatus } from "@/lib/statuses";

type EpisodeProgressFieldProps = {
  status: AnimeStatus;
  totalEpisodes: number | null;
  episodesWatched: number;
  onEpisodesWatchedChange: (episodesWatched: number) => void;
  compact?: boolean;
};

export function EpisodeProgressField({
  status,
  totalEpisodes,
  episodesWatched,
  onEpisodesWatchedChange,
  compact = false,
}: EpisodeProgressFieldProps) {
  if (!statusShowsEpisodeProgress(status)) return null;

  const max = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : undefined;

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-sky-300">
        Episodes watched
        {totalEpisodes ? ` (of ${totalEpisodes})` : ""}
      </label>
      <input
        type="number"
        min={0}
        max={max}
        value={episodesWatched}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed)) {
            const clamped =
              max != null ? Math.min(max, Math.max(0, parsed)) : Math.max(0, parsed);
            onEpisodesWatchedChange(clamped);
          }
        }}
        className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/60"
        placeholder={totalEpisodes ? `0 – ${totalEpisodes}` : "e.g. 12"}
      />
    </div>
  );
}
