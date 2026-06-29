import type { AnimeEntry } from "@/lib/types";

const CACHE_KEY = "anime-watchlist-list-v1";
const MAX_AGE_MS = 10 * 60 * 1000;

type CachePayload = {
  savedAt: number;
  list: AnimeEntry[];
};

export function loadAnimeListCache(): AnimeEntry[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CachePayload;
    if (!Array.isArray(payload.list)) return null;
    if (Date.now() - payload.savedAt > MAX_AGE_MS) return null;
    return payload.list;
  } catch {
    return null;
  }
}

export function saveAnimeListCache(list: AnimeEntry[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: CachePayload = { savedAt: Date.now(), list };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota — ignorieren
  }
}

export function clearAnimeListCache(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
