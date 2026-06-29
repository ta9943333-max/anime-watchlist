"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

type LazyCoverImageProps = {
  src: string | null | undefined;
  /** Weitere URLs, wenn die primäre fehlschlägt */
  fallbacks?: string[];
  alt?: string;
  className?: string;
  onClick?: () => void;
};

export function LazyCoverImage({
  src,
  fallbacks = [],
  alt = "",
  className = "aspect-[2/3] w-full object-cover",
  onClick,
}: LazyCoverImageProps) {
  const sources = useMemo(
    () =>
      [...new Set([src, ...fallbacks].filter((u): u is string => Boolean(u?.trim())))],
    [src, fallbacks],
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const currentSrc = sources[sourceIndex];

  if (!currentSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--surface-elevated)] ${className}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") onClick();
              }
            : undefined
        }
      >
        <Sparkles className="h-8 w-8 text-[var(--accent)]/40" />
      </div>
    );
  }

  return (
    <div className="relative">
      {!loaded && (
        <div
          className={`anilist-skeleton absolute inset-0 ${className}`}
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={currentSrc}
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          if (sourceIndex < sources.length - 1) {
            setSourceIndex((index) => index + 1);
          } else {
            setSourceIndex(sources.length);
          }
        }}
        onClick={onClick}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${onClick ? "cursor-pointer" : ""}`}
      />
    </div>
  );
}
