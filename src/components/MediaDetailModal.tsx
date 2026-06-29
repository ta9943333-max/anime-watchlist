"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { LazyCoverImage } from "@/components/ui/LazyCoverImage";
import {
  fetchMediaWithFailover,
  type NormalizedMedia,
} from "@/lib/anilist/media-provider";

type MediaDetailModalProps = {
  anilistId?: number | null;
  malId?: number | null;
  fallbackTitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
};

export function MediaDetailModal({
  anilistId,
  malId,
  fallbackTitle,
  onClose,
  actions,
}: MediaDetailModalProps) {
  const [media, setMedia] = useState<NormalizedMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMediaWithFailover({ anilistId, malId }).then((result) => {
      if (!cancelled) {
        setMedia(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [anilistId, malId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = media?.title ?? fallbackTitle ?? "Anime";
  const malUrl =
    (media?.malId ?? malId) && (media?.malId ?? malId)! > 0
      ? `https://myanimelist.net/anime/${media?.malId ?? malId}`
      : null;
  const anilistUrl =
    (media?.anilistId ?? anilistId) && (media?.anilistId ?? anilistId)! > 0
      ? `https://anilist.co/anime/${media?.anilistId ?? anilistId}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="surface-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden sm:max-h-[85vh]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="line-clamp-1 text-lg font-bold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:flex-row">
          <div className="mx-auto w-36 shrink-0 sm:mx-0">
            {loading ? (
              <div className="anilist-skeleton aspect-[2/3] w-full" />
            ) : (
              <LazyCoverImage
                src={media?.imageUrl}
                alt={title}
                className="aspect-[2/3] w-full rounded object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lade Details…
              </div>
            ) : (
              <>
                {media?.studios && media.studios.length > 0 && (
                  <p className="text-sm text-primary">{media.studios.join(", ")}</p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                  {media?.malStatus && <span>{media.malStatus}</span>}
                  {media?.episodes != null && (
                    <span>{media.episodes} Folgen</span>
                  )}
                  {media?.score != null && media.score > 0 && (
                    <span className="font-semibold text-[var(--score)]">
                      MAL ★ {media.score.toFixed(1)}
                    </span>
                  )}
                  {media?.stale && (
                    <span className="text-[var(--text-dim)]">(Cache)</span>
                  )}
                </div>
                {media?.genres && media.genres.length > 0 && (
                  <p className="text-xs text-[var(--text-dim)]">
                    {media.genres.join(" · ")}
                  </p>
                )}
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  {media?.synopsis ?? "Keine Beschreibung verfügbar."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {malUrl && (
                    <a
                      href={malUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-primary"
                    >
                      MAL <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {anilistUrl && (
                    <a
                      href={anilistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-primary"
                    >
                      AniList <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </>
            )}
            {actions ? <div className="pt-2">{actions}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
