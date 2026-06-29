"use client";

import { useState } from "react";
import { EpisodeIncrementButton } from "@/components/ui/EpisodeIncrementButton";
import { saveMediaListEntryNow } from "@/lib/anilist/client-api";
import type { ScoreFormat } from "@/lib/anilist/rating";
import {
  MEDIA_LIST_STATUSES,
  MEDIA_LIST_STATUS_LABELS,
  type AnilistMediaListEntry,
  type MediaListStatus,
} from "@/lib/anilist/types";

type AniListListEditorProps = {
  entry: AnilistMediaListEntry | null;
  mediaId: number;
  totalEpisodes: number | null;
  scoreFormat: ScoreFormat;
  onUpdated: (entry: AnilistMediaListEntry) => void;
};

export function AniListListEditor({
  entry,
  mediaId,
  totalEpisodes,
  scoreFormat,
  onUpdated,
}: AniListListEditorProps) {
  const [status, setStatus] = useState<MediaListStatus>(
    entry?.status ?? "PLANNING",
  );
  const [progress, setProgress] = useState(entry?.progress ?? 0);
  const [scoreInput, setScoreInput] = useState(
    entry?.score && entry.score > 0 ? String(entry.score) : "",
  );
  const [saving, setSaving] = useState(false);

  async function persist(patch: {
    status?: MediaListStatus;
    progress?: number;
    score?: number | null;
  }) {
    setSaving(true);
    try {
      const result = await saveMediaListEntryNow({
        id: entry?.id,
        mediaId,
        status: patch.status ?? status,
        progress: patch.progress ?? progress,
        score: patch.score !== undefined ? patch.score : entry?.score ?? 0,
      });
      const saved = (result as { SaveMediaListEntry: AnilistMediaListEntry })
        .SaveMediaListEntry;
      if (saved) {
        onUpdated({ ...entry!, ...saved, media: entry?.media! });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(next: MediaListStatus) {
    setStatus(next);
    let nextProgress = progress;
    if (
      next === "COMPLETED" &&
      totalEpisodes &&
      totalEpisodes > 0 &&
      progress < totalEpisodes
    ) {
      nextProgress = totalEpisodes;
      setProgress(nextProgress);
    }
    await persist({ status: next, progress: nextProgress });
  }

  async function handleIncrementFrom(next: number) {
    setProgress(next);
    let nextStatus = status;
    if (totalEpisodes && next >= totalEpisodes) {
      nextStatus = "COMPLETED";
      setStatus(nextStatus);
    } else if (status === "PLANNING") {
      nextStatus = "CURRENT";
      setStatus(nextStatus);
    }
    await persist({ progress: next, status: nextStatus });
  }

  async function handleIncrement() {
    await handleIncrementFrom(progress + 1);
  }

  async function handleScoreBlur() {
    const raw = parseFloat(scoreInput);
    if (Number.isNaN(raw) || raw <= 0) {
      await persist({ score: 0 });
      return;
    }
    await persist({ score: raw });
  }

  return (
    <div className="surface-card space-y-4 p-4">
      <h3 className="text-sm font-semibold text-white">List Editor</h3>

      <label className="block text-xs text-[rgb(var(--color-text-light))]">
        Status
        <select
          value={status}
          disabled={saving}
          onChange={(e) =>
            void handleStatusChange(e.target.value as MediaListStatus)
          }
          className="mt-1 w-full rounded border border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground-grey))] px-3 py-2 text-sm text-white"
        >
          {MEDIA_LIST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEDIA_LIST_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <label className="flex-1 text-xs text-[rgb(var(--color-text-light))]">
          Progress
          <input
            type="number"
            min={0}
            max={totalEpisodes ?? undefined}
            value={progress}
            disabled={saving}
            onChange={(e) => setProgress(Number(e.target.value))}
            onBlur={() => void persist({ progress })}
            className="mt-1 w-full rounded border border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground-grey))] px-3 py-2 text-sm text-white"
          />
        </label>
        <EpisodeIncrementButton
          current={progress}
          max={totalEpisodes}
          onIncrement={(next) => void handleIncrementFrom(next)}
          disabled={saving}
        />
      </div>

      <label className="block text-xs text-[rgb(var(--color-text-light))]">
        Score ({scoreFormat})
        <input
          type="text"
          value={scoreInput}
          disabled={saving}
          onChange={(e) => setScoreInput(e.target.value)}
          onBlur={() => void handleScoreBlur()}
          className="mt-1 w-full rounded border border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground-grey))] px-3 py-2 text-sm text-white"
        />
      </label>
    </div>
  );
}
