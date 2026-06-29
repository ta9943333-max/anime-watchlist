/** Cover-URLs ohne pro-Karte API-Calls. */

export function anilistCoverUrl(
  anilistId: number,
  size: "medium" | "large" = "medium",
): string {
  return `https://s4.anilist.co/file/anilistcdn/media/anime/cover/${size}/${anilistId}.jpg`;
}

export function malCoverUrl(malId: number): string {
  const folder = String(malId).padStart(4, "0").slice(0, -2);
  return `https://cdn.myanimelist.net/images/anime/${folder}/${malId}/${malId}.jpg`;
}

export function resolveAnimeCoverUrl(options: {
  anilistId?: number | null;
  malId?: number | null;
  malImageUrl?: string | null;
}): string | null {
  if (options.malImageUrl) return options.malImageUrl;
  if (options.anilistId && options.anilistId > 0) {
    return anilistCoverUrl(options.anilistId, "medium");
  }
  if (options.malId && options.malId > 0) {
    return malCoverUrl(options.malId);
  }
  return null;
}
