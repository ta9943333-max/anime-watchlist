"use client";

import { useEffect } from "react";
import { Clock, Crown, Heart, Sparkles, Trophy, X } from "lucide-react";
import type { MonthlyRecap } from "@/lib/stats/leaderboard";

type MonthlyRecapModalProps = {
  recap: MonthlyRecap;
  currentUser: string;
  onClose: () => void;
};

export function MonthlyRecapModal({
  recap,
  currentUser,
  onClose,
}: MonthlyRecapModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const activeMembers = recap.members.filter(
    (member) => member.completedCount > 0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-violet-500/30 bg-slate-900 p-6 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300">
                Monatsrückblick
              </p>
              <h2 className="text-xl font-bold text-white">{recap.label}</h2>
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

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xl font-bold text-white">
              <Trophy className="h-4 w-4 text-amber-400" />
              {recap.totalCompleted}
            </p>
            <p className="text-xs text-slate-500">Serien zusammen</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-3 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xl font-bold text-white">
              <Clock className="h-4 w-4 text-sky-400" />
              {recap.totalHours}h
            </p>
            <p className="text-xs text-slate-500">Watchtime gesamt</p>
          </div>
        </div>

        {recap.topMember && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-300">
              <Crown className="h-4 w-4" />
              Top-Watcher
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {recap.topMember.name}
              {recap.topMember.name === currentUser && (
                <span className="ml-2 text-sm font-normal text-amber-300">
                  (du!)
                </span>
              )}
            </p>
            <p className="text-sm text-slate-400">
              {recap.topMember.completedCount} Serien ·{" "}
              {recap.topMember.episodesWatched} Folgen ·{" "}
              {recap.topMember.totalHours}h
            </p>
          </div>
        )}

        {recap.favorite && (
          <div className="mb-5 rounded-xl border border-violet-500/30 bg-violet-950/20 px-4 py-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-300">
              <Heart className="h-4 w-4" />
              Lieblingsshow des Monats
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {recap.favorite.title}
            </p>
            {recap.favorite.count > 0 && (
              <p className="text-sm text-slate-400">
                Ø {recap.favorite.average} bei {recap.favorite.count}{" "}
                {recap.favorite.count === 1 ? "Bewertung" : "Bewertungen"}
              </p>
            )}
          </div>
        )}

        {activeMembers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Wer wie viel geschaut hat
            </p>
            {activeMembers.map((member, index) => (
              <div
                key={member.name}
                className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800/60 text-sm font-bold text-slate-300">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                  {member.name}
                </span>
                <span className="shrink-0 text-sm text-slate-400">
                  {member.completedCount} Serien · {member.totalHours}h
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-slate-500">
            In {recap.label} wurde nichts abgeschlossen.
          </p>
        )}
      </div>
    </div>
  );
}
