const USER_KEY = "anime-watchlist-user";
const SESSION_VERSION_KEY = "anime-watchlist-session-version";

/** Erhöhen = alle Geräte müssen sich neu einloggen */
export const SESSION_VERSION = 3;

export function enforceSessionVersion(): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(SESSION_VERSION_KEY);
  if (stored !== String(SESSION_VERSION)) {
    localStorage.removeItem(USER_KEY);
    localStorage.setItem(SESSION_VERSION_KEY, String(SESSION_VERSION));
  }
}

export function loadCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  enforceSessionVersion();
  return localStorage.getItem(USER_KEY);
}

export function saveCurrentUser(user: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_VERSION_KEY, String(SESSION_VERSION));
  localStorage.setItem(USER_KEY, user);
}

export function clearCurrentUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

const RECAP_SEEN_KEY = "anime-watchlist-recap-seen";

/**
 * Welchen Monat sollen wir am Monatsende/-anfang zusammenfassen?
 * - Letzte 3 Tage des Monats → aktueller Monat
 * - Erste 5 Tage des Monats → Vormonat
 * Sonst null (kein automatischer Rückblick).
 */
export function getRecapMonthToShow(
  now = new Date(),
): { year: number; month: number } | null {
  const day = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  if (day >= daysInMonth - 2) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  if (day <= 5) {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: prev.getFullYear(), month: prev.getMonth() };
  }

  return null;
}

function recapKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function hasSeenRecap(year: number, month: number): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(RECAP_SEEN_KEY) === recapKey(year, month);
}

export function markRecapSeen(year: number, month: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECAP_SEEN_KEY, recapKey(year, month));
}

export function clearRecapSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECAP_SEEN_KEY);
}

/** Local discover-status + recap — does not touch Supabase. */
export function clearLocalProgressCache(): void {
  if (typeof window === "undefined") return;
  clearRecapSeen();
  const prefix = "anime-watchlist-discover-status:";
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      localStorage.removeItem(key);
    }
  }
}
