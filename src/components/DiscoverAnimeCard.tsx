"use client";

import { Loader2, Plus, Star } from "lucide-react";
import { AnimeLiveChartCard } from "@/components/AnimeLiveChartCard";
import { EpisodeProgressField } from "@/components/EpisodeProgressField";
import { RewatchCountField } from "@/components/RewatchCountField";
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
  onSetRewatchCount?: (animeId: string, rewatchCount: number) => void;
  onRateAnime?: (animeId: string, rating: number) => void;
  onSetPersonalStatus?: (status: AnimeStatus) => void;
  onSetPersonalEpisodes?: (episodesWatched: number) => void;
  onSetPersonalRating?: (rating: number) => void;
};

const RATING_VALUES = Array.from({ length: 10 }, (_, index) => index + 1);

export function DiscoverAnimeCard({
  anime,
  alreadyAdded,
  isAdding,
  onAdd,
  allowPersonalStatus = false,
  onSetMyStatus,
  onSetEpisodesWatched,
  onSetRewatchCount,
  onRateAnime,
  onSetPersonalStatus,
  onSetPersonalEpisodes,
  onSetPersonalRating,
}: DiscoverAnimeCardProps) {
  const myStatus = anime.myStatus ?? "none";
  const myEpisodesWatched =
    statusShowsEpisodeProgress(myStatus) && anime.myEpisodesWatched != null
      ? anime.myEpisodesWatched
      : 0;
  const myRewatchCount =
    anime.myRewatchCount != null && anime.myRewatchCount >= 1
      ? anime.myRewatchCount
      : 1;
  const myRating = anime.myRating ?? 0;

  const accentClassName =
    myStatus !== "none" || myRating > 0
      ? "ring-1 ring-violet-500/20"
      : undefined;

  const showWatchlistStatus =
    alreadyAdded && anime.watchlistId && onSetMyStatus != null;
  const showPersonalStatus =
    allowPersonalStatus && !alreadyAdded && onSetPersonalStatus != null;
  const showStatusControls = showWatchlistStatus || showPersonalStatus;
  const showWatchlistRating =
    alreadyAdded && anime.watchlistId && onRateAnime != null;
  const showPersonalRating =
    allowPersonalStatus && !alreadyAdded && onSetPersonalRating != null;

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

  function handleRewatchChange(value: number) {
    if (showWatchlistStatus && anime.watchlistId && onSetRewatchCount) {
      onSetRewatchCount(anime.watchlistId, value);
    }
  }

  function handleRatingChange(rating: number) {
    if (showWatchlistRating && anime.watchlistId && onRateAnime) {
      onRateAnime(anime.watchlistId, rating);
      return;
    }
    if (showPersonalRating && onSetPersonalRating) {
      onSetPersonalRating(rating);
    }
  }

  const ratingControl = showWatchlistRating || showPersonalRating;

  return (
    <AnimeLiveChartCard
      anime={anime}
      accentClassName={accentClassName}
      headerRight={
        myStatus !== "none" ? <StatusBadge status={myStatus} /> : undefined
      }
      actions={
        showStatusControls || ratingControl ? (
          <div className="space-y-2">
            {showStatusControls ? (
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
                {showWatchlistStatus && (
                  <RewatchCountField
                    status={myStatus}
                    rewatchCount={myRewatchCount}
                    totalEpisodes={anime.episodes}
                    compact
                    onRewatchCountChange={handleRewatchChange}
                  />
                )}
              </div>
            ) : null}

            {ratingControl ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                <label className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                  <Star className="h-3 w-3" />
                  Deine Bewertung
                  {showPersonalRating && !alreadyAdded ? (
                    <span className="normal-case text-slate-500">
                      (nur für dich)
                    </span>
                  ) : null}
                </label>
                <select
                  value={myRating}
                  onChange={(event) =>
                    handleRatingChange(Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-amber-500/30 bg-slate-950/80 px-2 py-1.5 text-xs text-amber-100 outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value={0}>Keine Bewertung</option>
                  {RATING_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {value} / 10
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
