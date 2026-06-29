"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreFormat } from "@/lib/anilist/rating";

export type AnilistSessionUser = {
  id: number;
  name: string;
  avatarUrl: string | null;
  scoreFormat: ScoreFormat;
};

export function useAnilistSession() {
  const [user, setUser] = useState<AnilistSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/anilist/auth/session", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        authenticated: boolean;
        user: AnilistSessionUser | null;
      };
      setUser(data.authenticated ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/anilist/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return { user, loading, refresh, logout };
}
