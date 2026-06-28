"use client";

import { statusShowsRewatchCount, type AnimeStatus } from "@/lib/statuses";

type RewatchCountFieldProps = {
  status: AnimeStatus;
  rewatchCount: number;
  totalEpisodes: number | null;
  onRewatchCountChange: (rewatchCount: number) => void;
  compact?: boolean;
};

export function RewatchCountField({
  status,
  rewatchCount,
  totalEpisodes,
  onRewatchCountChange,
  compact = false,
}: RewatchCountFieldProps) {
  if (!statusShowsRewatchCount(status)) return null;

  const times = Math.max(1, rewatchCount);
  const countedEpisodes =
    totalEpisodes && totalEpisodes > 0 ? totalEpisodes * times : null;

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-teal-300">
        Wie oft geschaut?
      </label>
      <input
        type="number"
        min={1}
        value={times}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed)) {
            onRewatchCountChange(Math.max(1, parsed));
          }
        }}
        className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500/60"
        placeholder="z. B. 3"
      />
      {countedEpisodes != null && (
        <p className="mt-1 text-[11px] text-slate-500">
          Zählt als {countedEpisodes} Folgen ({totalEpisodes} × {times})
        </p>
      )}
    </div>
  );
}
