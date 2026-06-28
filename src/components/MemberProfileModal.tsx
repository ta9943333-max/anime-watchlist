"use client";

import { useEffect, useMemo } from "react";
import { Star, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { buildMemberProfile } from "@/lib/stats/leaderboard";
import type { AnimeEntry } from "@/lib/types";

type MemberProfileModalProps = {
  name: string;
  animeList: AnimeEntry[];
  isCurrentUser: boolean;
  onClose: () => void;
};

export function MemberProfileModal({
  name,
  animeList,
  isCurrentUser,
  onClose,
}: MemberProfileModalProps) {
  const profile = useMemo(
    () => buildMemberProfile(name, animeList),
    [name, animeList],
  );

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const { stats, groups } = profile;

  const statCards = [
    { label: "Serien", value: stats.completedCount },
    { label: "Folgen", value: stats.episodesWatched },
    { label: "Stunden", value: stats.totalHours },
    { label: "Tage", value: stats.daysWatched },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-lg font-bold text-violet-300">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{name}</h2>
              <p className="text-sm text-slate-400">
                {isCurrentUser ? "Dein Profil" : "Profil"}
                {stats.ratedCount > 0 &&
                  ` · Ø ${stats.averageRating} bei ${stats.ratedCount} Bewertungen`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-slate-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-3 text-center"
            >
              <p className="text-xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            {isCurrentUser
              ? "Du hast noch keinen Status gesetzt."
              : `${name} hat noch keinen Status gesetzt.`}
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.status}>
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={group.status} />
                  <span className="text-xs text-slate-500">
                    {group.items.length}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                        {item.title}
                      </span>
                      {item.rating > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-300">
                          <Star className="h-3 w-3" />
                          {item.rating}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
