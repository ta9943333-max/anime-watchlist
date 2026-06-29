"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

type LazyCoverImageProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  onClick?: () => void;
};

export function LazyCoverImage({
  src,
  alt = "",
  className = "aspect-[2/3] w-full object-cover",
  onClick,
}: LazyCoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
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
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={onClick}
        className={`${className} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${onClick ? "cursor-pointer" : ""}`}
      />
    </div>
  );
}
