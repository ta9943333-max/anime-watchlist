"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AniListListEditor } from "@/components/anilist/AniListListEditor";
import { AniListMarkdown } from "@/components/anilist/AniListMarkdown";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import { fetchMediaDetailClient } from "@/lib/anilist/client-api";
import { fetchMediaWithFailover } from "@/lib/anilist/media-provider";
import { useAnilistSession } from "@/hooks/use-anilist-session";
import type { AnilistMediaDetail, AnilistMediaListEntry } from "@/lib/anilist/types";
import { pickMediaTitle } from "@/lib/anilist/types";
import { DEFAULT_SCORE_FORMAT } from "@/lib/anilist/rating";

type AniListMediaPageProps = {
  mediaId: number;
};

export function AniListMediaPage({ mediaId }: AniListMediaPageProps) {
  const { user } = useAnilistSession();
  const [media, setMedia] = useState<AnilistMediaDetail | null>(null);
  const [entry, setEntry] = useState<AnilistMediaListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMediaDetailClient(
        mediaId,
        user?.name ?? undefined,
      );
      const detail = data.Media as AnilistMediaDetail | null;
      if (detail) {
        setMedia(detail);
        setEntry(detail.mediaListEntry ?? null);
      } else {
        const fallback = await fetchMediaWithFailover({ anilistId: mediaId });
        if (fallback) {
          setStale(Boolean(fallback.stale));
          setMedia({
            id: fallback.anilistId || mediaId,
            idMal: fallback.malId,
            title: {
              romaji: fallback.titleRomaji ?? fallback.title,
              english: fallback.titleEnglish,
              native: null,
            },
            episodes: fallback.episodes,
            duration: fallback.episodeDurationMin,
            genres: fallback.genres,
            status: fallback.anilistStatus ?? null,
            description: fallback.synopsis,
            averageScore: fallback.score ? fallback.score * 10 : null,
            meanScore: null,
            format: null,
            source: null,
            seasonYear: fallback.malYear,
            season: fallback.malSeason?.toUpperCase() ?? null,
            coverImage: { large: fallback.imageUrl, medium: fallback.imageUrl },
            studios: { nodes: fallback.studios.map((name) => ({ name })) },
            characters: null,
            relations: null,
            nextAiringEpisode: fallback.nextEpisode
              ? {
                  episode: fallback.nextEpisode,
                  timeUntilAiring: fallback.timeUntilAiring ?? 0,
                  airingAt: fallback.airingAt ?? 0,
                }
              : null,
            mediaListEntry: null,
          });
        } else {
          setError("Medium nicht gefunden");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [mediaId, user?.name]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="anilist-skeleton aspect-[2/3] w-full max-w-[220px] rounded" />
        <div className="space-y-4">
          <div className="anilist-skeleton h-10 w-2/3 rounded" />
          <div className="anilist-skeleton h-32 w-full rounded" />
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <p className="py-16 text-center text-[rgb(var(--color-red))]">{error}</p>
    );
  }

  const title = pickMediaTitle(media.title);
  const cover =
    media.coverImage?.large ?? media.coverImage?.medium ?? undefined;
  const scoreFormat = user?.scoreFormat ?? DEFAULT_SCORE_FORMAT;

  return (
    <div className="space-y-6">
      {stale && (
        <p className="rounded bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Offline-Cache — Daten können veraltet sein. Live-AniList nicht erreichbar.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_280px]">
        <LazyCoverImage
          src={cover}
          alt={title}
          className="aspect-[2/3] w-full max-w-[220px] rounded object-cover"
        />

        <div className="min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {media.title.romaji && media.title.romaji !== title && (
              <p className="text-sm text-[rgb(var(--color-text-light))]">
                {media.title.romaji}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {media.averageScore != null && (
              <span className="rounded bg-[rgb(var(--color-foreground-grey))] px-2 py-1 text-[rgb(var(--color-accent))]">
                {Math.round(media.averageScore)}%
              </span>
            )}
            {media.episodes != null && (
              <span className="rounded bg-[rgb(var(--color-foreground-grey))] px-2 py-1">
                {media.episodes} Episodes
              </span>
            )}
            {media.seasonYear && (
              <span className="rounded bg-[rgb(var(--color-foreground-grey))] px-2 py-1">
                {media.season} {media.seasonYear}
              </span>
            )}
            {media.status && (
              <span className="rounded bg-[rgb(var(--color-foreground-grey))] px-2 py-1">
                {media.status}
              </span>
            )}
          </div>

          {media.genres?.length > 0 && (
            <p className="text-sm text-[rgb(var(--color-text-light))]">
              {media.genres.join(" · ")}
            </p>
          )}

          {media.studios?.nodes?.length ? (
            <p className="text-sm">
              <span className="text-[rgb(var(--color-text-light))]">Studio: </span>
              {media.studios.nodes.map((s) => s.name).join(", ")}
            </p>
          ) : null}

          {media.description && (
            <AniListMarkdown text={media.description} />
          )}

          {media.relations?.edges?.length ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-white">Related</h2>
              <div className="flex flex-wrap gap-2">
                {media.relations.edges.slice(0, 8).map((edge) => (
                  <Link
                    key={edge.node.id}
                    href={`/anime/${edge.node.id}`}
                    className="text-xs text-[rgb(var(--color-primary))] hover:underline"
                  >
                    {edge.relationType}:{" "}
                    {edge.node.title.english ?? edge.node.title.romaji}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {user && (
          <AniListListEditor
            entry={entry}
            mediaId={mediaId}
            totalEpisodes={media.episodes}
            scoreFormat={scoreFormat}
            onUpdated={(updated) => setEntry(updated)}
          />
        )}
      </div>
    </div>
  );
}
