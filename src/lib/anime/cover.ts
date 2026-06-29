/** Cover-URLs mit Fallback-Kette (AniList → MAL CDN). */

export function anilistCoverUrl(
  anilistId: number,
  size: "medium" | "large" = "medium",
): string {
  return `https://s4.anilist.co/file/anilistcdn/media/anime/cover/${size}/${anilistId}.jpg`;
}

export function malCoverUrls(malId: number): string[] {
  const id = String(malId);
  const folders = new Set<string>();
  if (id.length > 2) folders.add(id.slice(0, -2));
  folders.add(String(Math.floor(malId / 100)));
  if (id.length >= 2) folders.add(id.slice(0, 1));
  folders.add("0");

  const urls: string[] = [];
  for (const folder of folders) {
    urls.push(
      `https://cdn.myanimelist.net/images/anime/${folder}/${malId}/${malId}l.jpg`,
    );
    urls.push(
      `https://cdn.myanimelist.net/images/anime/${folder}/${malId}/${malId}.jpg`,
    );
  }
  return [...new Set(urls)];
}

export function malCoverUrl(malId: number): string {
  return malCoverUrls(malId)[0]!;
}

export function buildCoverFallbacks(options: {
  anilistId?: number | null;
  malId?: number | null;
  malImageUrl?: string | null;
}): string[] {
  const urls: string[] = [];

  if (options.malImageUrl?.trim()) {
    urls.push(options.malImageUrl.trim());
  }

  if (options.anilistId && options.anilistId > 0) {
    urls.push(anilistCoverUrl(options.anilistId, "large"));
    urls.push(anilistCoverUrl(options.anilistId, "medium"));
  }

  if (options.malId && options.malId > 0) {
    urls.push(...malCoverUrls(options.malId));
  }

  return [...new Set(urls)];
}

export function resolveAnimeCoverUrl(options: {
  anilistId?: number | null;
  malId?: number | null;
  malImageUrl?: string | null;
}): string | null {
  return buildCoverFallbacks(options)[0] ?? null;
}
