const USER_KEY = "anime-watchlist-user";

export function loadCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}

export function saveCurrentUser(user: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, user);
}

export function clearCurrentUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}
