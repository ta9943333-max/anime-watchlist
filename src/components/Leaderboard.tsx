"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Heart,
  Loader2,
  RefreshCw,
  Star,
  Trophy,
} from "lucide-react";
import {
  buildAnimeRatingRanking,
  buildLeaderboard,
  getAllGenres,
  getTopGenreLeader,
  type MemberLeaderboardStats,
} from "@/lib/stats/leaderboard";
import type { AnimeEntry, Member } from "@/lib/types";

type LeaderboardTab = "rankings" | "hours" | "rated" | "genres" | "month";

type LeaderboardProps = {
  members: Member[];
  animeList: AnimeEntry[];
  currentUser: string;
  isSyncingMal: boolean;
  onSyncMal: () => void;
  onOpenProfile: (name: string) => void;
};

const POPULAR_GENRES = [
  "Romance",
  "Action",
  "Comedy",
  "Drama",
  "Fantasy",
  "Slice of Life",
];

function RankBadge({ rank }: { rank: number }) {
  const colors =
    rank === 1
      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
      : rank === 2
        ? "bg-slate-400/20 text-slate-200 border-slate-400/40"
        : rank === 3
          ? "bg-orange-700/20 text-orange-300 border-orange-700/40"
          : "bg-slate-800/60 text-slate-400 border-slate-700/60";

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${colors}`}
    >
      {rank}
    </span>
  );
}

function StatRow({
  rank,
  member,
  primary,
  secondary,
  highlight,
  onClick,
}: {
  rank: number;
  member: MemberLeaderboardStats;
  primary: string;
  secondary?: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-violet-500/50 ${
        highlight
          ? "border-violet-500/40 bg-violet-600/10"
          : "border-slate-800/80 bg-slate-900/50"
      }`}
    >
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{member.name}</p>
        {secondary && (
          <p className="truncate text-xs text-slate-500">{secondary}</p>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold text-violet-300">{primary}</p>
    </button>
  );
}

export function Leaderboard({
  members,
  animeList,
  currentUser,
  isSyncingMal,
  onSyncMal,
  onOpenProfile,
}: LeaderboardProps) {
  const [tab, setTab] = useState<LeaderboardTab>("rankings");

  const stats = useMemo(
    () => buildLeaderboard(members, animeList),
    [members, animeList],
  );

  const hoursRanking = useMemo(
    () => [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes),
    [stats],
  );

  const monthRanking = useMemo(
    () => [...stats].sort((a, b) => b.thisMonth.completedCount - a.thisMonth.completedCount),
    [stats],
  );

  const animeRanking = useMemo(
    () => buildAnimeRatingRanking(animeList),
    [animeList],
  );

  const allGenres = useMemo(() => getAllGenres(animeList), [animeList]);
  const missingMalCount = useMemo(
    () => animeList.filter((anime) => !anime.totalDurationMin).length,
    [animeList],
  );

  const tabs: { id: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
    { id: "rankings", label: "Completed", icon: Trophy },
    { id: "hours", label: "Hours", icon: Clock },
    { id: "rated", label: "Top Anime", icon: Star },
    { id: "genres", label: "Genres", icon: Heart },
    { id: "month", label: "This Month", icon: Calendar },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          <p className="mt-1 text-sm text-slate-400">
            Rankings based on Completed / Rewatching status · MAL runtime data
          </p>
        </div>

        {missingMalCount > 0 && (
          <button
            type="button"
            onClick={onSyncMal}
            disabled={isSyncingMal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-600/25 disabled:opacity-50"
          >
            {isSyncingMal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync MAL data ({missingMalCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "rankings" && (
        <div className="space-y-2">
          {stats.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No members yet.</p>
          ) : (
            stats.map((member, index) => (
              <StatRow
                key={member.name}
                rank={index + 1}
                member={member}
                primary={`${member.completedCount} Serien`}
                secondary={`${member.episodesWatched} Folgen · ${member.totalHours}h · ${member.daysWatched} Tage`}
                highlight={member.name === currentUser}
                onClick={() => onOpenProfile(member.name)}
              />
            ))
          )}
        </div>
      )}

      {tab === "hours" && (
        <div className="space-y-2">
          {hoursRanking.map((member, index) => (
            <StatRow
              key={member.name}
              rank={index + 1}
              member={member}
              primary={`${member.totalHours} Stunden`}
              secondary={`${member.daysWatched} Tage · ${member.episodesWatched} Folgen`}
              highlight={member.name === currentUser}
              onClick={() => onOpenProfile(member.name)}
            />
          ))}
          {hoursRanking.every((m) => m.totalMinutes === 0) && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              No runtime data yet. Use &quot;Sync MAL data&quot; to fetch episode
              lengths from MyAnimeList.
            </p>
          )}
        </div>
      )}

      {tab === "rated" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">
            Beliebteste Anime nach Durchschnittsbewertung der Gruppe (1–10).
          </p>

          {animeRanking.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              Noch keine Bewertungen. Bewerte Anime auf den Karten mit 1–10.
            </p>
          ) : (
            animeRanking.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3"
              >
                <RankBadge rank={index + 1} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {entry.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {entry.count} {entry.count === 1 ? "Stimme" : "Stimmen"}
                    {entry.genres.length > 0 &&
                      ` · ${entry.genres.slice(0, 3).join(", ")}`}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-300">
                  <Star className="h-4 w-4" />
                  {entry.average}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "genres" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {POPULAR_GENRES.map((genre) => {
              const leader = getTopGenreLeader(stats, genre);
              const count =
                leader?.topGenres.find(
                  (entry) => entry.genre.toLowerCase() === genre.toLowerCase(),
                )?.count ?? 0;

              return (
                <div
                  key={genre}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Most {genre}
                  </p>
                  {leader && count > 0 ? (
                    <>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {leader.name}
                      </p>
                      <p className="text-sm text-violet-300">
                        {count} completed
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No data yet</p>
                  )}
                </div>
              );
            })}
          </div>

          {allGenres.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-400">
                All genres in your list
              </p>
              <div className="flex flex-wrap gap-2">
                {allGenres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "month" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Based on when someone set Completed or Rewatching this month.
          </p>

          <div className="space-y-2">
            {monthRanking.map((member, index) => (
              <div
                key={member.name}
                className={`rounded-xl border px-4 py-3 ${
                  member.name === currentUser
                    ? "border-violet-500/40 bg-violet-600/10"
                    : "border-slate-800/80 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RankBadge rank={index + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-sm text-violet-300">
                      {member.thisMonth.completedCount} completed ·{" "}
                      {Math.round(member.thisMonth.totalMinutes / 60 * 10) / 10}h
                    </p>
                  </div>
                </div>

                {member.thisMonth.titles.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-800/80 pt-3">
                    {member.thisMonth.titles.map((title) => (
                      <li
                        key={`${member.name}-${title}`}
                        className="truncate text-sm text-slate-400"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {monthRanking.every((m) => m.thisMonth.completedCount === 0) && (
              <p className="py-8 text-center text-slate-500">
                Nobody completed anything this month yet.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
