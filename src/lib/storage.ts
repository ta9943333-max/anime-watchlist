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
