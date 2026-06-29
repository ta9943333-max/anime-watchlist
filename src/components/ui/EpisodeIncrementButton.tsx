"use client";

import { Plus } from "lucide-react";

type EpisodeIncrementButtonProps = {
  current: number;
  max?: number | null;
  onIncrement: (next: number) => void;
  disabled?: boolean;
};

export function EpisodeIncrementButton({
  current,
  max,
  onIncrement,
  disabled = false,
}: EpisodeIncrementButtonProps) {
  const atMax = max != null && max > 0 && current >= max;

  return (
    <button
      type="button"
      disabled={disabled || atMax}
      onClick={() => onIncrement(max ? Math.min(current + 1, max) : current + 1)}
      className="btn-anilist-primary inline-flex shrink-0 items-center justify-center rounded px-2.5 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
      title="+1 Folge"
      aria-label="Eine Folge hinzufügen"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
