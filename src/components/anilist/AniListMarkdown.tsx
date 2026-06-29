"use client";

import { useEffect, useRef } from "react";
import {
  bindSpoilerClicks,
  parseAniListMarkdown,
} from "@/lib/anilist/markdown";

type AniListMarkdownProps = {
  text: string;
  className?: string;
};

export function AniListMarkdown({ text, className = "" }: AniListMarkdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const html = parseAniListMarkdown(text);

  useEffect(() => {
    if (!ref.current) return;
    return bindSpoilerClicks(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={`anilist-markdown text-sm leading-relaxed text-[rgb(var(--color-text))] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
