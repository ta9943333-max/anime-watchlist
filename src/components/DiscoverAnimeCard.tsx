"use client";

import { Loader2, Plus } from "lucide-react";
import { AnimeLiveChartCard } from "@/components/AnimeLiveChartCard";
import { EpisodeProgressField } from "@/components/EpisodeProgressField";
import { StatusBadge } from "@/components/StatusBadge";
import {
  STATUS_OPTIONS,
  statusShowsEpisodeProgress,
  type AnimeStatus,
} from "@/lib/statuses";
import type { DiscoverItem } from "@/lib/mal/jikan";

type DiscoverAnimeCardProps = {
  anime: DiscoverItem;
  alreadyAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
  allowPersonalStatus?: boolean;
  onSetMyStatus?: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched?: (animeId: string, episodesWatched: number) => void;
  onSetPersonalStatus?: (status: AnimeStatus) => void;
  onSetPersonalEpisodes?: (episodesWatched: number) => void;
};

export function DiscoverAnimeCard({
  anime,
  alreadyAdded,
  isAdding,
  onAdd,
  allowPersonalStatus = false,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetPersonalStatus,
  onSetPersonalEpisodes,
}: DiscoverAnimeCardProps) {
  const myStatus = anime.myStatus ?? "none";
  const myEpisodesWatched =
    statusShowsEpisodeProgress(myStatus) && anime.myEpisodesWatched != null
      ? anime.myEpisodesWatched
      : 0;

  const accentClassName =
    myStatus !== "none" ? "ring-1 ring-violet-500/20" : undefined;

  const showWatchlistStatus =
    alreadyAdded && anime.watchlistId && onSetMyStatus != null;
  const showPersonalStatus =
    allowPersonalStatus && !alreadyAdded && onSetPersonalStatus != null;
  const showStatusControls = showWatchlistStatus || showPersonalStatus;

  function handleStatusChange(status: AnimeStatus) {
    if (showWatchlistStatus && anime.watchlistId && onSetMyStatus) {
      onSetMyStatus(anime.watchlistId, status);
      return;
    }
    if (showPersonalStatus && onSetPersonalStatus) {
      onSetPersonalStatus(status);
    }
  }

  function handleEpisodesChange(value: number) {
    if (showWatchlistStatus && anime.watchlistId && onSetEpisodesWatched) {
      onSetEpisodesWatched(anime.watchlistId, value);
      return;
    }
    if (showPersonalStatus && onSetPersonalEpisodes) {
      onSetPersonalEpisodes(value);
    }
  }

  return (
    <AnimeLiveChartCard
      anime={anime}
      accentClassName={accentClassName}
      headerRight={
        myStatus !== "none" ? <StatusBadge status={myStatus} /> : undefined
      }
      actions={
        showStatusControls ? (
          <div className="space-y-2 rounded-lg border border-violet-500/25 bg-violet-950/20 p-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-violet-300">
                Dein Status
                {showPersonalStatus && !alreadyAdded ? (
                  <span className="ml-1 normal-case text-slate-500">
                    (nur für dich)
                  </span>
                ) : null}
              </label>
              <select
                value={myStatus}
                onChange={(event) =>
                  handleStatusChange(event.target.value as AnimeStatus)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-slate-950"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <EpisodeProgressField
              status={myStatus}
              totalEpisodes={anime.episodes}
              episodesWatched={myEpisodesWatched}
              compact
              onEpisodesWatchedChange={handleEpisodesChange}
            />
          </div>
        ) : undefined
      }
      footerExtra={
        !alreadyAdded ? (
          <button
            type="button"
            disabled={isAdding}
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-100 transition hover:bg-violet-600/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Zur Liste hinzufügen
          </button>
        ) : (
          <span className="text-xs font-medium text-emerald-400/90">
            Auf der Watchlist
          </span>
        )
      }
    />
  );
}
