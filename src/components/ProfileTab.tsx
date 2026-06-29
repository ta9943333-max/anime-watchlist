"use client";

import { LogOut, Star } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildMemberProfile } from "@/lib/stats/leaderboard";
import type { AnimeEntry } from "@/lib/types";

type ProfileTabProps = {
  name: string;
  animeList: AnimeEntry[];
  accessMode: "open" | "site" | "member";
  onLogout: () => void;
  onOpenMember: (name: string) => void;
};

export function ProfileTab({
  name,
  animeList,
  accessMode,
  onLogout,
  onOpenMember,
}: ProfileTabProps) {
  const profile = buildMemberProfile(name, animeList);
  const { stats, groups } = profile;

  const statCards = [
    { label: "Abgeschlossen", value: stats.completedCount },
    { label: "Folgen", value: stats.episodesWatched },
    { label: "Stunden", value: stats.totalHours },
    { label: "Tage", value: stats.daysWatched },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-2xl font-bold text-[var(--accent)]">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{name}</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {stats.ratedCount > 0
                ? `Ø ${stats.averageRating} · ${stats.ratedCount} Bewertungen`
                : "Dein AniList-Profil"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {accessMode === "member" ? "Logout" : "Wechseln"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-center"
          >
            <p className="text-2xl font-bold text-white tabular-nums">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{card.label}</p>
          </div>
        ))}
      </div>

      {stats.topGenres.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            Top Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.topGenres.map((g) => (
              <span
                key={g.genre}
                className="rounded-lg bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--foreground)]"
              >
                {g.genre}{" "}
                <span className="text-[var(--text-dim)]">({g.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-12 text-center text-[var(--text-muted)]">
          Noch keine Einträge in deiner Bibliothek.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.status}>
              <div className="mb-3 flex items-center gap-2">
                <StatusBadge status={group.status} />
                <span className="text-xs text-[var(--text-dim)]">
                  {group.items.length}
                </span>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenMember(name)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left transition hover:border-[var(--accent)]/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
                        {item.title}
                      </span>
                      {item.rating > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--score)]">
                          <Star className="h-3 w-3 fill-[var(--score)]" />
                          {item.rating}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
